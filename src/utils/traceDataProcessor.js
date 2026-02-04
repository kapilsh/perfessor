import { classifyEvent, isGPUEvent, isCPUEvent, isKernelEvent, hasTensorCoreSupport } from './eventClassifier';

// Convert Begin/End pairs to Complete events
const convertBeginEndToComplete = (events) => {
  const completeEvents = [];
  const stacks = {}; // key: `${pid}_${tid}_${name}`

  for (const event of events) {
    if (event.ph === 'X') {
      completeEvents.push(event);
      continue;
    }

    if (event.ph === 'B') {
      const key = `${event.pid}_${event.tid}_${event.name}`;
      if (!stacks[key]) stacks[key] = [];
      stacks[key].push(event);
    } else if (event.ph === 'E') {
      const key = `${event.pid}_${event.tid}_${event.name}`;
      if (stacks[key] && stacks[key].length > 0) {
        const beginEvent = stacks[key].pop();
        completeEvents.push({
          ...beginEvent,
          ph: 'X',
          dur: event.ts - beginEvent.ts,
        });
      }
    } else {
      // Keep instant, metadata, counter, and async events
      completeEvents.push(event);
    }
  }

  return completeEvents;
};

// Extract GPU metadata from PyTorch trace
const extractGPUInfo = (rawData, events) => {
  const gpuInfo = {
    name: 'Unknown GPU',
    memory: 0,
    computeCapability: 'Unknown',
  };

  // First, check if there's deviceProperties in the raw data (PyTorch format)
  if (rawData && rawData.deviceProperties && Array.isArray(rawData.deviceProperties)) {
    const device = rawData.deviceProperties[0]; // Get first GPU
    if (device) {
      if (device.name) {
        gpuInfo.name = device.name;
      }
      if (device.totalGlobalMem) {
        gpuInfo.memory = device.totalGlobalMem;
      }
      if (device.computeMajor !== undefined && device.computeMinor !== undefined) {
        gpuInfo.computeCapability = `${device.computeMajor}.${device.computeMinor}`;
      }
    }
  }

  // Fallback: check metadata events
  events.forEach(event => {
    if (event.ph === 'm' && event.args) {
      if (event.args.device_name) {
        gpuInfo.name = event.args.device_name;
      }
      if (event.args.device_memory) {
        gpuInfo.memory = event.args.device_memory;
      }
      if (event.args.compute_capability) {
        gpuInfo.computeCapability = event.args.compute_capability;
      }
    }
  });

  return gpuInfo;
};

// Extract metadata events
const extractMetadata = (events) => {
  const metadata = {
    processNames: {},
    threadNames: {},
    sortIndex: {},
  };

  events.forEach(event => {
    if (event.ph === 'm') {
      if (event.name === 'process_name') {
        metadata.processNames[event.pid] = event.args?.name || 'Unknown';
      } else if (event.name === 'thread_name') {
        metadata.threadNames[`${event.pid}_${event.tid}`] = event.args?.name || 'Unknown';
      } else if (event.name === 'process_sort_index') {
        metadata.sortIndex[event.pid] = event.args?.sort_index || 0;
      }
    }
  });

  return metadata;
};

// Build call hierarchy using timestamps
const buildCallHierarchy = (events) => {
  const completeEvents = events.filter(e => e.ph === 'X' && e.dur !== undefined);
  completeEvents.sort((a, b) => a.ts - b.ts);

  const threadGroups = {};
  completeEvents.forEach(event => {
    const threadKey = `${event.pid}_${event.tid}`;
    if (!threadGroups[threadKey]) threadGroups[threadKey] = [];
    threadGroups[threadKey].push(event);
  });

  const eventsWithHierarchy = [];

  Object.values(threadGroups).forEach(threadEvents => {
    const stack = [];

    threadEvents.forEach(event => {
      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        const topEnd = top.ts + top.dur;
        if (topEnd <= event.ts) {
          stack.pop();
        } else {
          break;
        }
      }

      const parent = stack.length > 0 ? stack[stack.length - 1] : null;
      const depth = stack.length;

      eventsWithHierarchy.push({
        ...event,
        parent: parent ? parent.id : null,
        depth,
        id: eventsWithHierarchy.length,
      });

      stack.push({
        ...event,
        id: eventsWithHierarchy.length - 1,
      });
    });
  });

  return eventsWithHierarchy;
};

// Calculate self-time by subtracting child durations
const calculateSelfTimes = (events) => {
  return events.map(event => {
    const children = events.filter(e => e.parent === event.id);
    const childrenTotalDur = children.reduce((sum, child) => sum + child.dur, 0);
    const selfTime = event.dur - childrenTotalDur;

    return {
      ...event,
      selfTime: Math.max(0, selfTime),
    };
  });
};

// Aggregate operations by name
const aggregateOperators = (events, metadata) => {
  const aggregated = {};

  events.forEach(event => {
    if (event.ph !== 'X') return;

    const name = event.name;
    const isGPU = isGPUEvent(event);
    const isCPU = isCPUEvent(event);

    if (!aggregated[name]) {
      aggregated[name] = {
        name,
        category: event.cat || 'unknown',
        calls: 0,
        deviceSelfDuration: 0,
        deviceTotalDuration: 0,
        hostSelfDuration: 0,
        hostTotalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        inputShapes: new Set(),
        callStack: [],
        invocations: [],
      };
    }

    aggregated[name].calls++;

    if (isGPU) {
      aggregated[name].deviceSelfDuration += event.selfTime || event.dur;
      aggregated[name].deviceTotalDuration += event.dur;
    } else if (isCPU) {
      aggregated[name].hostSelfDuration += event.selfTime || event.dur;
      aggregated[name].hostTotalDuration += event.dur;
    }

    aggregated[name].minDuration = Math.min(aggregated[name].minDuration, event.dur);
    aggregated[name].maxDuration = Math.max(aggregated[name].maxDuration, event.dur);

    // Track input shapes if available
    if (event.args && event.args['Input Dims']) {
      aggregated[name].inputShapes.add(JSON.stringify(event.args['Input Dims']));
    }

    // Store invocations
    aggregated[name].invocations.push({
      timestamp: event.ts,
      duration: event.dur,
      selfTime: event.selfTime || event.dur,
      args: event.args,
    });
  });

  // Convert to array and calculate percentages
  const totalDeviceTime = Object.values(aggregated).reduce(
    (sum, op) => sum + op.deviceSelfDuration, 0
  );
  const totalHostTime = Object.values(aggregated).reduce(
    (sum, op) => sum + op.hostSelfDuration, 0
  );

  return Object.values(aggregated).map(op => ({
    ...op,
    inputShapes: Array.from(op.inputShapes),
    selfCudaTimePercent: totalDeviceTime > 0 ? (op.deviceSelfDuration / totalDeviceTime) * 100 : 0,
    selfCpuTimePercent: totalHostTime > 0 ? (op.hostSelfDuration / totalHostTime) * 100 : 0,
    avgDuration: (op.deviceTotalDuration + op.hostTotalDuration) / op.calls,
  })).sort((a, b) => b.deviceSelfDuration - a.deviceSelfDuration);
};

// Aggregate kernel statistics
const aggregateKernels = (events) => {
  const aggregated = {};

  events.forEach(event => {
    if (!isKernelEvent(event) || event.ph !== 'X') return;

    const name = event.name;

    if (!aggregated[name]) {
      aggregated[name] = {
        name,
        calls: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        tensorCoresUsed: hasTensorCoreSupport(name),
        blocksPerSM: [],
        occupancy: [],
      };
    }

    aggregated[name].calls++;
    aggregated[name].totalDuration += event.dur;
    aggregated[name].minDuration = Math.min(aggregated[name].minDuration, event.dur);
    aggregated[name].maxDuration = Math.max(aggregated[name].maxDuration, event.dur);

    // Extract kernel-specific metrics if available
    if (event.args) {
      if (event.args['Blocks Per SM']) {
        aggregated[name].blocksPerSM.push(event.args['Blocks Per SM']);
      }
      if (event.args['Est. Achieved Occupancy']) {
        aggregated[name].occupancy.push(event.args['Est. Achieved Occupancy']);
      }
    }
  });

  return Object.values(aggregated).map(kernel => ({
    ...kernel,
    meanDuration: kernel.totalDuration / kernel.calls,
    meanBlocksPerSM: kernel.blocksPerSM.length > 0
      ? kernel.blocksPerSM.reduce((a, b) => a + b, 0) / kernel.blocksPerSM.length
      : 0,
    meanOccupancy: kernel.occupancy.length > 0
      ? kernel.occupancy.reduce((a, b) => a + b, 0) / kernel.occupancy.length
      : 0,
  })).sort((a, b) => b.totalDuration - a.totalDuration);
};

// Calculate step time breakdown
const calculateStepTimeBreakdown = (events) => {
  const breakdown = {
    Kernel: 0,
    Memcpy: 0,
    Memset: 0,
    Communication: 0,
    Runtime: 0,
    DataLoader: 0,
    'CPU Exec': 0,
    Other: 0,
  };

  events.forEach(event => {
    if (event.ph !== 'X' || !event.dur) return;

    const category = classifyEvent(event);
    const selfTime = event.selfTime || event.dur;

    if (breakdown[category] !== undefined) {
      breakdown[category] += selfTime;
    }
  });

  // Calculate total
  const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  // Convert to array with percentages
  return Object.entries(breakdown).map(([name, time]) => ({
    name,
    time,
    percentage: total > 0 ? (time / total) * 100 : 0,
  }));
};

// Calculate GPU utilization estimate
const calculateGPUUtilization = (events, totalDuration) => {
  const gpuEvents = events.filter(e => isGPUEvent(e) && e.ph === 'X');

  if (gpuEvents.length === 0 || totalDuration === 0) return 0;

  // Sum GPU time (this is a rough estimate)
  const totalGPUTime = gpuEvents.reduce((sum, e) => sum + (e.selfTime || e.dur), 0);

  // GPU utilization as percentage
  return Math.min(100, (totalGPUTime / totalDuration) * 100);
};

// Main processing function
export const processTraceData = (rawData) => {
  try {
    // Parse JSON if it's a string
    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    // Extract events array
    let events = [];
    if (Array.isArray(data)) {
      events = data;
    } else if (data.traceEvents && Array.isArray(data.traceEvents)) {
      events = data.traceEvents;
    } else {
      throw new Error('Invalid trace format: expected array or object with traceEvents property');
    }

    if (events.length === 0) {
      throw new Error('No events found in trace file');
    }

    // Step 1: Convert Begin/End pairs to Complete events
    const completeEvents = convertBeginEndToComplete(events);

    // Step 2: Extract metadata and GPU info
    const metadata = extractMetadata(completeEvents);
    const gpuInfo = extractGPUInfo(data, completeEvents);

    // Step 3: Build call hierarchy
    const eventsWithHierarchy = buildCallHierarchy(completeEvents);

    // Step 4: Calculate self-times
    const eventsWithSelfTime = calculateSelfTimes(eventsWithHierarchy);

    // Step 5: Aggregate operators
    const operators = aggregateOperators(eventsWithSelfTime, metadata);

    // Step 6: Aggregate kernels
    const kernels = aggregateKernels(eventsWithSelfTime);

    // Step 7: Calculate step time breakdown
    const stepTimeBreakdown = calculateStepTimeBreakdown(eventsWithSelfTime);

    // Step 8: Calculate summary statistics
    const completeEventsOnly = eventsWithSelfTime.filter(e => e.ph === 'X' && e.dur !== undefined);

    if (completeEventsOnly.length === 0) {
      throw new Error('No complete events found in trace');
    }

    const startTime = completeEventsOnly.reduce((min, e) => Math.min(min, e.ts), Infinity);
    const endTime = completeEventsOnly.reduce((max, e) => Math.max(max, e.ts + e.dur), 0);
    const totalDuration = endTime - startTime;

    // Step 9: Calculate GPU utilization
    const gpuUtilization = calculateGPUUtilization(eventsWithSelfTime, totalDuration);

    // Step 10: Extract memory events (PyTorch uses instant events with name "[memory]")
    const memoryEvents = completeEvents
      .filter(e => (e.ph === 'i' && e.name === '[memory]') ||
                   (e.ph === 'C' && e.name && e.name.toLowerCase().includes('memory')))
      .map(e => ({
        timestamp: e.ts,
        name: e.name,
        bytes: e.args?.Bytes || 0,
        addr: e.args?.Addr,
        totalAllocated: e.args?.['Total Allocated'] || 0,
        totalReserved: e.args?.['Total Reserved'] || 0,
        deviceId: e.args?.['Device Id'],
        deviceType: e.args?.['Device Type'], // 0 = CPU, 1 = CUDA
        value: e.args?.['Total Allocated'] || (e.args ? Object.values(e.args)[0] : 0),
        args: e.args,
      }));

    return {
      events: eventsWithSelfTime,
      metadata,
      operators,
      kernels,
      memoryEvents,
      modules: [], // Will be populated by moduleParser
      stepTimeBreakdown,
      gpuUtilization,
      gpuInfo,
      recommendations: [], // Will be populated by recommendationsEngine
      summary: {
        totalDuration,
        eventCount: events.length,
        operatorCount: operators.length,
        kernelCount: kernels.length,
        startTime,
        endTime,
      },
    };
  } catch (error) {
    console.error('Error processing trace data:', error);
    throw new Error(`Failed to process trace data: ${error.message}`);
  }
};
