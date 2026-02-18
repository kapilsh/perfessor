import useNcuStore from '../../store/ncuStore.js';
import { NcuHelpers } from '../../utils/ncuHelpers.js';

const NcuKernelSidebar = () => {
  const {
    files, activeFileIndex, activeKernelIndex,
    compareMode,
    searchText, typeFilter,
    selectKernel, setSearch, setTypeFilter,
    getKernelSummary, kernelTypes,
    isInComparison,
  } = useNcuStore();

  const kernel = useNcuStore(s => s.getActiveKernel());
  const multiFile = files.length > 1;

  const handleExportCSV = () => {
    if (!kernel) return;
    const summary = getKernelSummary(kernel);

    const q = (s) => {
      const str = String(s ?? '');
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const rows = [
      ['Kernel', 'Grid', 'Block'],
      [kernel.name, summary.grid, summary.block],
      [],
      ['Section', 'Metric', 'Unit', 'Value'],
    ];

    kernel.sections.forEach(sec => {
      if (!sec.metrics?.length) return;
      sec.metrics.forEach(m => {
        rows.push([sec.name, m.name || '', m.unit || '', String(m.value ?? '')]);
      });
    });

    const csv = rows.map(row => row.map(q).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${summary.shortName}_metrics.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const isVisible = (kernel) => {
    const summary = getKernelSummary(kernel);
    const type = NcuHelpers.classifyKernel(kernel.name);
    const matchesSearch = !searchText ||
      summary.shortName.toLowerCase().includes(searchText.toLowerCase()) ||
      kernel.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesType = !typeFilter || type === typeFilter;
    return matchesSearch && matchesType;
  };

  return (
    <aside className="ncu-sidebar">
      {/* Search + Filter */}
      <div className="ncu-sidebar-header">
        <h3>Kernels</h3>
        <input
          type="text"
          className="ncu-kernel-search"
          placeholder="Search kernels..."
          value={searchText}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="ncu-kernel-filter"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          {kernelTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Action buttons */}
      {kernel && (
        <div className="ncu-sidebar-actions">
          <button className="ncu-action-btn" onClick={handleExportCSV}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
        </div>
      )}

      {/* Kernel list */}
      <ul className="ncu-kernel-list">
        {files.map((file, fi) => {
          const filteredKernels = file.kernels
            .map((k, ki) => ({ kernel: k, kernelIndex: ki }))
            .filter(({ kernel }) => isVisible(kernel));

          if (multiFile) {
            return (
              <li key={fi} className="ncu-file-group">
                <div className="ncu-file-group-header" title={file.fileName}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.fileName}
                  </span>
                  <span className="ncu-file-kernel-count">{filteredKernels.length}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {filteredKernels.map(({ kernel, kernelIndex }) => (
                    <KernelItem
                      key={kernelIndex}
                      kernel={kernel}
                      fileIndex={fi}
                      kernelIndex={kernelIndex}
                      isActive={fi === activeFileIndex && kernelIndex === activeKernelIndex}
                      isCompared={isInComparison(fi, kernelIndex)}
                      compareMode={compareMode}
                      getKernelSummary={getKernelSummary}
                      onSelect={selectKernel}
                    />
                  ))}
                </ul>
              </li>
            );
          }

          return filteredKernels.map(({ kernel, kernelIndex }) => (
            <KernelItem
              key={kernelIndex}
              kernel={kernel}
              fileIndex={fi}
              kernelIndex={kernelIndex}
              isActive={fi === activeFileIndex && kernelIndex === activeKernelIndex}
              isCompared={isInComparison(fi, kernelIndex)}
              compareMode={compareMode}
              getKernelSummary={getKernelSummary}
              onSelect={selectKernel}
            />
          ));
        })}
      </ul>
    </aside>
  );
};

const TYPE_CLASS = {
  GEMM: 'ncu-type-gemm', Conv: 'ncu-type-conv', Reduce: 'ncu-type-reduce',
  Elementwise: 'ncu-type-elementwise', Softmax: 'ncu-type-softmax', Norm: 'ncu-type-norm',
  Attention: 'ncu-type-attention', RNG: 'ncu-type-rng', Memory: 'ncu-type-memory',
  Compute: 'ncu-type-compute',
};

const KernelItem = ({ kernel, fileIndex, kernelIndex, isActive, isCompared, compareMode, getKernelSummary, onSelect }) => {
  const summary = getKernelSummary(kernel);
  const type = NcuHelpers.classifyKernel(kernel.name);

  let cls = 'ncu-kernel-item';
  if (isActive && !compareMode) cls += ' active';
  if (isCompared) cls += ' compare-selected';

  return (
    <li className={cls} onClick={() => onSelect(fileIndex, kernelIndex)}>
      <div className="ncu-kernel-name" title={kernel.name}>{summary.shortName}</div>
      <div className="ncu-kernel-meta">
        <span className={`ncu-type-tag ${TYPE_CLASS[type] || 'ncu-type-compute'}`}>{type}</span>
        <span className="ncu-dim-tag">Grid: {summary.grid}</span>
        <span className="ncu-dim-tag">Block: {summary.block}</span>
        {summary.duration && <span className="ncu-dur-tag">{summary.duration}</span>}
      </div>
    </li>
  );
};

export default NcuKernelSidebar;
