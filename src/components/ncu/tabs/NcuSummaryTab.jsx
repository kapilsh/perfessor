import { useState } from 'react';
import useNcuStore from '../../../store/ncuStore.js';
import { NcuHelpers } from '../../../utils/ncuHelpers.js';
import { HintBox } from '../NcuShared.jsx';

const NcuSummaryTab = () => {
  const { files, getKernelSummary, selectKernel } = useNcuStore();
  const [search, setSearch] = useState('');

  const allHints = [];
  files.forEach((file, fileIndex) => {
    file.kernels.forEach((kernel, kernelIndex) => {
      const summary = getKernelSummary(kernel);
      kernel.sections.forEach(sec => {
        sec.hints.forEach(hint => {
          allHints.push({
            fileIndex, kernelIndex,
            kernelName: summary.shortName,
            kernelFullName: kernel.name,
            sectionName: sec.name,
            type: hint.type,
            text: hint.text,
            priority: extractPriority(hint.text, hint.type),
          });
        });
      });
    });
  });

  allHints.sort((a, b) => {
    if (a.type === 'OPT' && b.type !== 'OPT') return -1;
    if (a.type !== 'OPT' && b.type === 'OPT') return 1;
    return b.priority - a.priority;
  });

  const totalKernels = files.reduce((sum, f) => sum + f.kernels.length, 0);
  const optCount = allHints.filter(h => h.type === 'OPT').length;
  const infCount = allHints.filter(h => h.type === 'INF').length;

  return (
    <div>
      <h2 className="ncu-section-title">Summary: All Kernels</h2>
      <div className="ncu-summary-stats">
        <div className="ncu-summary-stat">
          <span className="ncu-stat-value">{totalKernels}</span>
          <span className="ncu-stat-label">Total Kernels</span>
        </div>
        <div className="ncu-summary-stat">
          <span className="ncu-stat-value ncu-color-orange">{optCount}</span>
          <span className="ncu-stat-label">Optimization Hints</span>
        </div>
        <div className="ncu-summary-stat">
          <span className="ncu-stat-value ncu-color-blue">{infCount}</span>
          <span className="ncu-stat-label">Info Messages</span>
        </div>
      </div>

      <h3 className="ncu-subsection-title">Prioritized Rules</h3>

      {allHints.length === 0 ? (
        <p className="ncu-empty-msg">No optimization hints or information messages found.</p>
      ) : (() => {
        const q = (s) => {
          const str = String(s ?? '');
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"` : str;
        };

        const filtered = search
          ? allHints.filter(h =>
              h.kernelName.toLowerCase().includes(search.toLowerCase()) ||
              h.sectionName.toLowerCase().includes(search.toLowerCase()) ||
              h.text.toLowerCase().includes(search.toLowerCase()) ||
              h.type.toLowerCase().includes(search.toLowerCase())
            )
          : allHints;

        const handleExport = () => {
          const rows = [
            ['Type', 'Kernel', 'Section', 'Hint'],
            ...filtered.map(h => [h.type, h.kernelFullName, h.sectionName, h.text]),
          ];
          const csv = rows.map(r => r.map(q).join(',')).join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'ncu_summary_hints.csv';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 100);
        };

        return (
          <>
            <div className="ncu-table-controls">
              <input
                type="text"
                className="ncu-table-search"
                placeholder="Search hints..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button className="ncu-table-export-btn" onClick={handleExport}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export CSV
              </button>
              <span className="ncu-table-count">{filtered.length} of {allHints.length} hints</span>
            </div>
            <table className="ncu-summary-table">
              <thead>
                <tr>
                  <th className="col-type">Type</th>
                  <th className="col-kernel">Kernel</th>
                  <th className="col-section">Section</th>
                  <th className="col-hint">Hint</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((hint, i) => (
                  <tr
                    key={i}
                    className="ncu-summary-row"
                    onClick={() => selectKernel(hint.fileIndex, hint.kernelIndex)}
                    title={hint.kernelFullName}
                  >
                    <td>
                      <span className={`ncu-badge ${hint.type === 'OPT' ? 'ncu-badge-opt' : 'ncu-badge-inf'}`}>
                        {hint.type}
                      </span>
                    </td>
                    <td className="col-kernel">{hint.kernelName}</td>
                    <td className="col-section">{hint.sectionName}</td>
                    <td className="col-hint">{hint.text}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#6b7280', padding: '1rem' }}>No hints match "{search}"</td></tr>
                )}
              </tbody>
            </table>
          </>
        );
      })()}
    </div>
  );
};

function extractPriority(text, type) {
  let base = type === 'OPT' ? 100 : 0;
  const speedup = text.match(/(\d+(?:\.\d+)?)\s*[x×]\s*speedup/i);
  if (speedup) base += parseFloat(speedup[1]) * 10;
  const pct = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:faster|improvement)/i);
  if (pct) base += parseFloat(pct[1]);
  return base;
}

export default NcuSummaryTab;
