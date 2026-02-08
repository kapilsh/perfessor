/* eslint-disable no-restricted-globals */
// Web Worker for processing large trace files off the main thread

import { classifyEvent, isGPUEvent, isCPUEvent, isKernelEvent, hasTensorCoreSupport } from '../utils/eventClassifier';

// Send progress updates to main thread
const reportProgress = (stage, percent, message) => {
  self.postMessage({
    type: 'progress',
    stage,
    percent,
    message,
  });
};

// Convert Begin/End pairs to Complete events
const convertBeginEndToComplete = (events) => {
  const completeEvents = [];
  const stacks = {};
  const total = events.length;
  let processed = 0;

  for (const event of events) {
    if (processed % 50000 === 0) {
      reportProgress('convert', (processed / total) * 100, `Converting events: ${processed.toLocaleString()}/${total.toLocaleString()}`);
    }

    if (event.ph === 'X') {
      completeEvents.push(event);
      processed++;
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
      completeEvents.push(event);
    }
    processed++;
  }

  return completeEvents;
};

// Extract GPU metadata
const extractGPUInfo = (rawData, events) => {
  const gpuInfo = {
    name: 'Unknown GPU',
    memory: 0,
    computeCapability: 'Unknown',
  };

  if (rawData && rawData.deviceProperties && Array.isArray(rawData.deviceProperties)) {
    const device = rawData.deviceProperties[0];
    if (device) {
      if (device.name) gpuInfo.name = device.name;
      if (device.totalGlobalMem) gpuInfo.memory = device.totalGlobalMem;
      if (device.computeMajor !== undefined && device.computeMinor !== undefined) {
        gpuInfo.computeCapability = `${device.computeMajor}.${device.computeMinor}`;
      }
    }
  }

  events.forEach(event => {
    if (event.ph === 'm' && event.args) {
      if (event.args.device_name) gpuInfo.name = event.args.device_name;
      if (event.args.device_memory) gpuInfo.memory = event.args.device_memory;
      if (event.args.compute_capability) gpuInfo.computeCapability = event.args.compute_capability;
    }
  });

  return gpuInfo;
};

// Extract metadata
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

// Build call hierarchy
const buildCallHierarchy = (events) => {
  reportProgress('hierarchy', 0, 'Building call hierarchy...');

  const completeEvents = events.filter(e => e.ph === 'X' && e.dur !== undefined);
  completeEvents.sort((a, b) => a.ts - b.ts);

  const threadGroups = {};
  completeEvents.forEach(event => {
    const threadKey = `${event.pid}_${event.tid}`;
    if (!threadGroups[threadKey]) threadGroups[threadKey] = [];
    threadGroups[threadKey].push(event);
  });

  const eventsWithHierarchy = [];
  const threadKeys = Object.keys(threadGroups);
  let processedThreads = 0;

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

    processedThreads++;
    reportProgress('hierarchy', (processedThreads / threadKeys.length) * 100,
      `Processing threads: ${processedThreads}/${threadKeys.length}`);
  });

  return eventsWithHierarchy;
};

// Calculate self-times (optimized to O(n) instead of O(n²))
const calculateSelfTimes = (events) => {
  reportProgress('selftime', 0, 'Calculating self times...');
  const total = events.length;

  // Build parent->children lookup map (O(n))
  reportProgress('selftime', 10, 'Building hierarchy map...');
  const childrenMap = new Map();
  for (const event of events) {
    if (event.parent !== null && event.parent !== undefined) {
      if (!childrenMap.has(event.parent)) {
        childrenMap.set(event.parent, []);
      }
      childrenMap.get(event.parent).push(event);
    }
  }

  // Calculate self times using the map (O(n))
  reportProgress('selftime', 30, 'Calculating self times...');
  const result = [];

  for (let idx = 0; idx < events.length; idx++) {
    if (idx % 50000 === 0) {
      reportProgress('selftime', 30 + ((idx / total) * 70), `Processing: ${idx.toLocaleString()}/${total.toLocaleString()}`);
    }

    const event = events[idx];
    const children = childrenMap.get(event.id) || [];
    const childrenTotalDur = children.reduce((sum, child) => sum + child.dur, 0);
    const selfTime = event.dur - childrenTotalDur;

    result.push({
      ...event,
      selfTime: Math.max(0, selfTime),
    });
  }

  reportProgress('selftime', 100, `Completed: ${total.toLocaleString()} events`);
  return result;
};

// Check if event is a PyTorch operator (not kernel, runtime, or profiler metadata)
const isOperator = (event) => {
  const cat = (event.cat || '').toLowerCase();
  const name = event.name || '';

  // Exclude ProfilerStep events (even if they're user_annotation)
  if (name.startsWith('ProfilerStep#')) return false;

  // Exclude DataLoader events (TensorBoard shows these separately)
  if (name.startsWith('enumerate(DataLoader)#') || name.startsWith('enumerate(DataPipe)#')) return false;

  // Exclude Optimizer events (TensorBoard shows these separately)
  if (name.startsWith('Optimizer.step#')) return false;

  // Exclude CUDA runtime calls
  if (cat.includes('cuda_runtime') || cat.includes('runtime')) return false;

  // Exclude kernels (they go in kernels tab)
  if (cat.includes('kernel')) return false;

  // Exclude memcpy/memset
  if (cat.includes('memcpy') || cat.includes('memset')) return false;

  // Exclude memory events
  if (name === '[memory]') return false;

  // Exclude python_function (these are Python-level calls, not operators)
  // TensorBoard does NOT show these in operators view
  if (cat.includes('python_function')) return false;

  // Include CPU operators (main category for PyTorch operators)
  if (cat.includes('cpu_op') || cat.includes('operator')) {
    return true;
  }

  // Include user annotations ONLY if they're communication ops
  // Check for common communication operation names
  if (cat.includes('user_annotation')) {
    const nameLower = name.toLowerCase();
    // NCCL ops: all_reduce, all_gather, reduce_scatter, broadcast, etc.
    const isNcclOp = nameLower.includes('nccl:') ||
                     nameLower.includes('all_reduce') ||
                     nameLower.includes('all_gather') ||
                     nameLower.includes('reduce_scatter') ||
                     nameLower.includes('broadcast');

    // Gloo ops
    const isGlooOp = nameLower.includes('gloo:');

    return isNcclOp || isGlooOp;
  }

  // Include events that look like PyTorch operators (aten::, c10::, etc.)
  if (name.includes('aten::') || name.includes('c10::') || name.includes('torch::')) {
    return true;
  }

  return false;
};

// Aggregate operators
const aggregateOperators = (events) => {
  reportProgress('aggregate', 0, 'Aggregating operators...');
  const aggregated = {};
  const total = events.length;

  events.forEach((event, idx) => {
    if (idx % 20000 === 0) {
      reportProgress('aggregate', (idx / total) * 100, `Processing: ${idx.toLocaleString()}/${total.toLocaleString()}`);
    }

    if (event.ph !== 'X') return;

    // Filter to only actual operators
    if (!isOperator(event)) return;

    const name = event.name;
    const isGPU = isGPUEvent(event);
    const isCPU = isCPUEvent(event);

    if (!aggregated[name]) {
      const cat = (event.cat || '').toLowerCase();
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
        isUserAnnotation: cat.includes('user_annotation'),
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

    if (event.args && event.args['Input Dims']) {
      aggregated[name].inputShapes.add(JSON.stringify(event.args['Input Dims']));
    }
  });

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

// Check if event is an actual GPU kernel (not runtime call)
const isActualKernel = (event) => {
  const cat = (event.cat || '').toLowerCase();
  const name = event.name || '';

  // Must have kernel category
  if (!cat.includes('kernel')) return false;

  // Exclude runtime calls like cuLaunchKernel
  if (name.includes('cuLaunchKernel') || name.includes('cudaLaunchKernel')) return false;

  return true;
};

// Aggregate kernels
const aggregateKernels = (events) => {
  reportProgress('kernels', 0, 'Aggregating kernels...');
  const aggregated = {};

  events.forEach(event => {
    if (!isActualKernel(event) || event.ph !== 'X') return;

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
        durations: [],
      };
    }

    aggregated[name].calls++;
    aggregated[name].totalDuration += event.dur;
    aggregated[name].minDuration = Math.min(aggregated[name].minDuration, event.dur);
    aggregated[name].maxDuration = Math.max(aggregated[name].maxDuration, event.dur);
    aggregated[name].durations.push(event.dur);

    if (event.args) {
      // Note: field names are case-sensitive and use lowercase (from PyTorch profiler)
      // Store both the metric value and duration for weighted averaging (matching torch-tb-profiler)
      if (event.args['blocks per SM'] !== undefined) {
        aggregated[name].blocksPerSM.push({
          value: event.args['blocks per SM'],
          duration: event.dur
        });
      }
      if (event.args['est. achieved occupancy %'] !== undefined) {
        aggregated[name].occupancy.push({
          value: event.args['est. achieved occupancy %'],
          duration: event.dur
        });
      }
    }
  });

  // Helper function for weighted average (matches torch-tb-profiler behavior)
  const weightedAvg = (samples) => {
    if (samples.length === 0) return 0;
    const totalWeight = samples.reduce((sum, s) => sum + s.duration, 0);
    if (totalWeight === 0) return 0;
    const weightedSum = samples.reduce((sum, s) => sum + (s.value * s.duration), 0);
    return weightedSum / totalWeight;
  };

  return Object.values(aggregated).map(kernel => ({
    ...kernel,
    meanDuration: kernel.totalDuration / kernel.calls,
    meanBlocksPerSM: weightedAvg(kernel.blocksPerSM),
    meanOccupancy: weightedAvg(kernel.occupancy),
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

  const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  return Object.entries(breakdown).map(([name, time]) => ({
    name,
    time,
    percentage: total > 0 ? (time / total) * 100 : 0,
  }));
};

// Calculate GPU utilization
const calculateGPUUtilization = (events, totalDuration) => {
  const gpuEvents = events.filter(e => isGPUEvent(e) && e.ph === 'X');

  if (gpuEvents.length === 0 || totalDuration === 0) return 0;

  const totalGPUTime = gpuEvents.reduce((sum, e) => sum + (e.selfTime || e.dur), 0);
  return Math.min(100, (totalGPUTime / totalDuration) * 100);
};

// Main worker message handler
self.onmessage = async (e) => {
  const { type, data } = e.data;

  if (type === 'process') {
    try {
      const overallStartTime = performance.now();
      reportProgress('parse', 0, 'Parsing JSON... (this may take a minute for large files)');

      // Parse JSON - this is the slowest part for large files
      const parseStartTime = performance.now();
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      const parseTime = ((performance.now() - parseStartTime) / 1000).toFixed(1);

      reportProgress('parse', 100, `JSON parsed successfully in ${parseTime}s`);

      // Extract events
      let events = [];
      if (Array.isArray(parsedData)) {
        events = parsedData;
      } else if (parsedData.traceEvents && Array.isArray(parsedData.traceEvents)) {
        events = parsedData.traceEvents;
      } else {
        throw new Error('Invalid trace format');
      }

      if (events.length === 0) {
        throw new Error('No events found in trace file');
      }

      reportProgress('start', 0, `Processing ${events.length.toLocaleString()} events...`);

      // Step 1: Convert events
      const completeEvents = convertBeginEndToComplete(events);

      // Step 2: Extract metadata
      reportProgress('metadata', 0, 'Extracting metadata...');
      const metadata = extractMetadata(completeEvents);
      const gpuInfo = extractGPUInfo(parsedData, completeEvents);

      // Step 3: Build hierarchy
      const eventsWithHierarchy = buildCallHierarchy(completeEvents);

      // Step 4: Calculate self-times
      const eventsWithSelfTime = calculateSelfTimes(eventsWithHierarchy);

      // Step 5: Aggregate operators
      const operators = aggregateOperators(eventsWithSelfTime);

      // Step 6: Aggregate kernels
      const kernels = aggregateKernels(eventsWithSelfTime);

      // Step 7: Calculate breakdown
      reportProgress('breakdown', 0, 'Calculating time breakdown...');
      const stepTimeBreakdown = calculateStepTimeBreakdown(eventsWithSelfTime);

      // Step 8: Calculate summary
      reportProgress('summary', 0, 'Calculating summary statistics...');
      const completeEventsOnly = eventsWithSelfTime.filter(e => e.ph === 'X' && e.dur !== undefined);

      const startTime = completeEventsOnly.reduce((min, e) => Math.min(min, e.ts), Infinity);
      const endTime = completeEventsOnly.reduce((max, e) => Math.max(max, e.ts + e.dur), 0);
      const totalDuration = endTime - startTime;

      const gpuUtilization = calculateGPUUtilization(eventsWithSelfTime, totalDuration);

      // Extract memory events
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
          deviceType: e.args?.['Device Type'],
          value: e.args?.['Total Allocated'] || (e.args ? Object.values(e.args)[0] : 0),
          args: e.args,
        }));

      const totalTime = ((performance.now() - overallStartTime) / 1000).toFixed(1);
      reportProgress('complete', 100, `Processing complete in ${totalTime}s!`);

      // Send final result
      self.postMessage({
        type: 'complete',
        result: {
          events: eventsWithSelfTime,
          metadata,
          operators,
          kernels,
          memoryEvents,
          modules: [],
          stepTimeBreakdown,
          gpuUtilization,
          gpuInfo,
          recommendations: [],
          summary: {
            totalDuration,
            eventCount: events.length,
            operatorCount: operators.length,
            kernelCount: kernels.length,
            startTime,
            endTime,
          },
        },
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message,
      });
    }
  }
};
