import { create } from 'zustand';
import { NcuParser } from '../utils/ncuParser.js';
import { NcuHelpers } from '../utils/ncuHelpers.js';

const KERNEL_TYPES = ['GEMM', 'Conv', 'Reduce', 'Elementwise', 'Softmax', 'Norm', 'Attention', 'Memory', 'Compute'];

function kernelSummary(kernel) {
  let shortName = kernel.name || 'Unknown';
  const parenIdx = shortName.indexOf('(');
  if (parenIdx > 0) shortName = shortName.substring(0, parenIdx);
  const parts = shortName.split('::');
  shortName = parts[parts.length - 1];

  let duration = '';
  const sol = NcuHelpers.findSection(kernel.sections, 'GPU Speed Of Light Throughput');
  if (sol) {
    const dur = NcuHelpers.findMetric(sol, 'Duration');
    if (dur) duration = dur.value + ' ' + dur.unit;
  }

  return { shortName, grid: kernel.grid || '?', block: kernel.block || '?', duration, name: kernel.name };
}

const useNcuStore = create((set, get) => ({
  // Data
  files: [],          // [{ fileName, kernels, sessionInfo }]
  sessionInfo: null,  // from first file loaded
  isLoading: false,
  error: null,

  // Selection state
  activeFileIndex: -1,
  activeKernelIndex: -1,
  activeTab: 'summary',

  // Comparison
  baseline: null,       // { fileIndex, kernelIndex, kernel }
  compareMode: false,
  compareKernels: [],   // [{ fileIndex, kernelIndex, kernel }]

  // Filters
  searchText: '',
  typeFilter: '',

  // Helpers (exposed so components can use them without importing separately)
  kernelTypes: KERNEL_TYPES,

  // ---- Computed helpers ----
  getKernelSummary: (kernel) => kernelSummary(kernel),

  getActiveKernel: () => {
    const { files, activeFileIndex, activeKernelIndex } = get();
    const file = files[activeFileIndex];
    return file ? file.kernels[activeKernelIndex] : null;
  },

  // ---- Actions ----
  loadFile: async (file) => {
    set({ isLoading: true, error: null });
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await NcuParser.parseFile(arrayBuffer.slice(0));

      const fileEntry = { fileName: file.name, kernels: result.kernels, sessionInfo: result.sessionInfo };
      const fileIndex = 0;

      set({
        files: [fileEntry],
        sessionInfo: result.sessionInfo,
        activeFileIndex: result.kernels.length > 0 ? 0 : -1,
        activeKernelIndex: result.kernels.length > 0 ? 0 : -1,
        activeTab: 'summary',
        baseline: null,
        compareMode: false,
        compareKernels: [],
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false, error: err.message });
    }
  },

  addFile: async (file) => {
    set({ isLoading: true, error: null });
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await NcuParser.parseFile(arrayBuffer);

      set((state) => {
        const newFiles = [...state.files, { fileName: file.name, kernels: result.kernels, sessionInfo: result.sessionInfo }];
        const fileIndex = newFiles.length - 1;
        return {
          files: newFiles,
          activeFileIndex: fileIndex,
          activeKernelIndex: result.kernels.length > 0 ? 0 : -1,
          isLoading: false,
        };
      });
    } catch (err) {
      set({ isLoading: false, error: err.message });
    }
  },

  selectKernel: (fileIndex, kernelIndex) => {
    const { compareMode, compareKernels, files } = get();

    if (compareMode) {
      const kernel = files[fileIndex]?.kernels[kernelIndex];
      if (!kernel) return;

      const isAlreadyIn = compareKernels.some(ck => ck.fileIndex === fileIndex && ck.kernelIndex === kernelIndex);
      if (isAlreadyIn) {
        set({ compareKernels: compareKernels.filter(ck => !(ck.fileIndex === fileIndex && ck.kernelIndex === kernelIndex)) });
      } else if (compareKernels.length < 4) {
        set({ compareKernels: [...compareKernels, { fileIndex, kernelIndex, kernel }] });
      }
      return;
    }

    set({ activeFileIndex: fileIndex, activeKernelIndex: kernelIndex });
  },

  selectTab: (tabId) => set({ activeTab: tabId }),

  setBaseline: () => {
    const { activeFileIndex, activeKernelIndex, baseline } = get();
    const kernel = get().getActiveKernel();
    if (!kernel) return;

    const isCurrent = baseline?.fileIndex === activeFileIndex && baseline?.kernelIndex === activeKernelIndex;
    if (isCurrent) {
      set({ baseline: null });
    } else {
      set({ baseline: { fileIndex: activeFileIndex, kernelIndex: activeKernelIndex, kernel } });
    }
  },

  clearBaseline: () => set({ baseline: null }),

  toggleCompareMode: () => {
    const { compareMode, compareKernels, activeFileIndex, activeKernelIndex } = get();
    const kernel = get().getActiveKernel();

    if (!compareMode) {
      const initial = kernel ? [{ fileIndex: activeFileIndex, kernelIndex: activeKernelIndex, kernel }] : [];
      set({ compareMode: true, compareKernels: initial });
    } else {
      set({ compareMode: false, compareKernels: [] });
    }
  },

  isInComparison: (fileIndex, kernelIndex) => {
    return get().compareKernels.some(ck => ck.fileIndex === fileIndex && ck.kernelIndex === kernelIndex);
  },

  setSearch: (text) => set({ searchText: text }),

  setTypeFilter: (type) => set({ typeFilter: type }),

  clearAll: () => set({
    files: [],
    sessionInfo: null,
    isLoading: false,
    error: null,
    activeFileIndex: -1,
    activeKernelIndex: -1,
    activeTab: 'summary',
    baseline: null,
    compareMode: false,
    compareKernels: [],
    searchText: '',
    typeFilter: '',
  }),
}));

export default useNcuStore;
