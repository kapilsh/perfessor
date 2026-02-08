import { create } from 'zustand';

// Helper function to get active trace
const getActiveTrace = (state) => {
  return state.traces.find(t => t.id === state.activeTraceId) || null;
};

const useTraceStore = create((set, get) => ({
  // Multiple traces support
  traces: [],
  activeTraceId: null,
  isLoading: false,
  error: null,
  progress: null, // { stage, percent, message }

  // View state
  currentView: 'overview',
  selectedOperator: null,
  selectedKernel: null,
  selectedModule: null,
  filters: {},
  sortConfig: {},

  // Computed properties for active trace data (accessed via selectors)
  rawTraceData: null,
  fileName: null,
  events: [],
  metadata: {},
  operators: [],
  kernels: [],
  memoryEvents: [],
  modules: [],
  stepTimeBreakdown: [],
  gpuUtilization: 0,
  recommendations: [],
  gpuInfo: {},
  summary: {},

  // Actions
  addTrace: (fileData, processedData) => {
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTrace = {
      id: traceId,
      fileName: fileData.fileName,
      rawTraceData: fileData.rawData,
      uploadedAt: new Date().toISOString(),
      ...processedData,
    };

    set((state) => ({
      traces: [...state.traces, newTrace],
      activeTraceId: traceId,
      isLoading: false,
      error: null,
      // Update computed properties from new active trace
      rawTraceData: newTrace.rawTraceData,
      fileName: newTrace.fileName,
      events: newTrace.events,
      metadata: newTrace.metadata,
      operators: newTrace.operators,
      kernels: newTrace.kernels,
      memoryEvents: newTrace.memoryEvents,
      modules: newTrace.modules,
      stepTimeBreakdown: newTrace.stepTimeBreakdown,
      gpuUtilization: newTrace.gpuUtilization,
      recommendations: newTrace.recommendations,
      gpuInfo: newTrace.gpuInfo,
      summary: newTrace.summary,
    }));
  },

  setActiveTrace: (traceId) => {
    const state = get();
    const activeTrace = state.traces.find(t => t.id === traceId);

    if (activeTrace) {
      set({
        activeTraceId: traceId,
        rawTraceData: activeTrace.rawTraceData,
        fileName: activeTrace.fileName,
        events: activeTrace.events,
        metadata: activeTrace.metadata,
        operators: activeTrace.operators,
        kernels: activeTrace.kernels,
        memoryEvents: activeTrace.memoryEvents,
        modules: activeTrace.modules,
        stepTimeBreakdown: activeTrace.stepTimeBreakdown,
        gpuUtilization: activeTrace.gpuUtilization,
        recommendations: activeTrace.recommendations,
        gpuInfo: activeTrace.gpuInfo,
        summary: activeTrace.summary,
      });
    }
  },

  removeTrace: (traceId) => {
    const state = get();
    const newTraces = state.traces.filter(t => t.id !== traceId);
    let newActiveTraceId = state.activeTraceId;

    // If removing active trace, switch to another one
    if (state.activeTraceId === traceId) {
      newActiveTraceId = newTraces.length > 0 ? newTraces[0].id : null;
    }

    const newActiveTrace = newTraces.find(t => t.id === newActiveTraceId);

    set({
      traces: newTraces,
      activeTraceId: newActiveTraceId,
      // Update computed properties from new active trace (or clear if none)
      rawTraceData: newActiveTrace?.rawTraceData || null,
      fileName: newActiveTrace?.fileName || null,
      events: newActiveTrace?.events || [],
      metadata: newActiveTrace?.metadata || {},
      operators: newActiveTrace?.operators || [],
      kernels: newActiveTrace?.kernels || [],
      memoryEvents: newActiveTrace?.memoryEvents || [],
      modules: newActiveTrace?.modules || [],
      stepTimeBreakdown: newActiveTrace?.stepTimeBreakdown || [],
      gpuUtilization: newActiveTrace?.gpuUtilization || 0,
      recommendations: newActiveTrace?.recommendations || [],
      gpuInfo: newActiveTrace?.gpuInfo || {},
      summary: newActiveTrace?.summary || {},
    });
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false, progress: null }),

  setProgress: (progress) => set({ progress, isLoading: progress !== null }),

  setView: (view) => set({ currentView: view }),

  setSelectedOperator: (operator) => set({ selectedOperator: operator }),

  setSelectedKernel: (kernel) => set({ selectedKernel: kernel }),

  setSelectedModule: (module) => set({ selectedModule: module }),

  setFilter: (viewName, filterKey, filterValue) => {
    set((state) => ({
      filters: {
        ...state.filters,
        [viewName]: {
          ...state.filters[viewName],
          [filterKey]: filterValue,
        },
      },
    }));
  },

  setSortConfig: (viewName, sortConfig) => {
    set((state) => ({
      sortConfig: {
        ...state.sortConfig,
        [viewName]: sortConfig,
      },
    }));
  },

  reset: () => {
    set({
      traces: [],
      activeTraceId: null,
      isLoading: false,
      error: null,
      currentView: 'overview',
      selectedOperator: null,
      selectedKernel: null,
      selectedModule: null,
      filters: {},
      sortConfig: {},
    });
  },
}));

export default useTraceStore;
