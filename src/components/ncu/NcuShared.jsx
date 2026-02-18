// Shared JSX helpers used across NCU tab components

import { useState } from 'react';
import { getMetricDescription } from '../../utils/ncuMetricDescriptions.js';
import { NcuHelpers } from '../../utils/ncuHelpers.js';
import useNcuStore from '../../store/ncuStore.js';

// ---- Metrics Table ----
export const MetricsTable = ({ section }) => {
  const [search, setSearch] = useState('');

  if (!section?.metrics?.length) return null;

  const filtered = search
    ? section.metrics.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        String(m.value ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : section.metrics;

  const handleExport = () => {
    const q = (s) => {
      const str = String(s ?? '');
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const rows = [
      ['Metric', 'Unit', 'Value'],
      ...filtered.map(m => [m.name || '', m.unit || '', String(m.value ?? '')]),
    ];
    const csv = rows.map(r => r.map(q).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${section.name || 'metrics'}.csv`;
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
          placeholder="Search metrics..."
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
        <span className="ncu-table-count">{filtered.length} of {section.metrics.length} metrics</span>
      </div>
      <table className="ncu-metric-table">
        <thead>
          <tr><th>Metric</th><th className="ncu-unit-col">Unit</th><th className="ncu-value-col">Value</th></tr>
        </thead>
        <tbody>
          {filtered.map((m, i) => {
            const desc = getMetricDescription(m.name);
            return (
              <tr key={i}>
                <td>
                  <span className="ncu-metric-name">
                    {m.name}
                    {desc && <span className="ncu-metric-help" title={desc}>?</span>}
                  </span>
                </td>
                <td className="ncu-unit-col">{m.unit}</td>
                <td className="ncu-value-col">{m.value}</td>
              </tr>
            );
          })}
          {filtered.length === 0 && (
            <tr><td colSpan={3} style={{ textAlign: 'center', color: '#6b7280', padding: '1rem' }}>No metrics match "{search}"</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
};

// ---- Hint Box ----
export const HintBox = ({ type, text, sectionName }) => {
  const cls = type === 'OPT' ? 'ncu-hint-opt' : 'ncu-hint-inf';
  const labelCls = type === 'OPT' ? 'ncu-hint-label-opt' : 'ncu-hint-label-inf';
  const label = type === 'OPT' ? 'OPT' : 'INF';
  return (
    <div className={`ncu-hint-box ${cls}`}>
      {sectionName && <span className="ncu-hint-section">[{sectionName}] </span>}
      <span className={`ncu-hint-label ${labelCls}`}>{label}</span>
      {text}
    </div>
  );
};

// ---- Section Hints ----
export const SectionHints = ({ section, sectionName }) => {
  if (!section?.hints?.length) return null;
  return (
    <>
      {section.hints.map((h, i) => (
        <HintBox key={i} type={h.type} text={h.text} sectionName={sectionName} />
      ))}
    </>
  );
};

// ---- Metric Card (with optional baseline comparison) ----
export const MetricCard = ({ value, unit, label, colorClass }) => {
  const { baseline } = useNcuStore();
  const desc = getMetricDescription(label);

  let comparisonEl = null;
  if (baseline) {
    const baselineValue = getBaselineMetricValue(baseline.kernel, label);
    if (baselineValue !== null) {
      const diff = compareMetrics(value, baselineValue, unit);
      if (diff) {
        comparisonEl = (
          <div className={`ncu-metric-comparison ${diff.cls}`}>{diff.text}</div>
        );
      }
    }
  }

  return (
    <div className="ncu-metric-card" title={desc || undefined}>
      <div className={`ncu-metric-value ${colorClass || ''}`}>
        {String(value)}
        <span className="ncu-metric-unit">{unit}</span>
      </div>
      <div className="ncu-metric-label">{label}</div>
      {comparisonEl}
    </div>
  );
};

function getBaselineMetricValue(kernel, label) {
  if (!kernel) return null;
  for (const sec of kernel.sections) {
    for (const m of sec.metrics) {
      if (m.name === label) return NcuHelpers.toNumber(m.value);
    }
  }
  return null;
}

function compareMetrics(currentValue, baselineValue, unit) {
  const current = typeof currentValue === 'number' ? currentValue : NcuHelpers.toNumber(currentValue);
  const baseline = typeof baselineValue === 'number' ? baselineValue : NcuHelpers.toNumber(baselineValue);
  if (isNaN(current) || isNaN(baseline) || baseline === 0) return null;

  const diff = current - baseline;
  const pct = (diff / baseline) * 100;
  const unitLower = (unit || '').toLowerCase();
  const lowerIsBetter = unitLower.includes('ms') || unitLower.includes('ns') || unitLower.includes('us') || unitLower.includes('cycle');
  const isImprovement = lowerIsBetter ? diff < 0 : diff > 0;

  return {
    text: `${diff > 0 ? '+' : ''}${Math.abs(pct).toFixed(1)}%`,
    cls: isImprovement ? 'ncu-better' : 'ncu-worse',
  };
}

// ---- Section Not Found ----
export const SectionMissing = () => (
  <p className="ncu-error-msg">Section data not available for this kernel.</p>
);
