// Shared JSX helpers used across NCU tab components

import { getMetricDescription } from '../../utils/ncuMetricDescriptions.js';
import { NcuHelpers } from '../../utils/ncuHelpers.js';
import useNcuStore from '../../store/ncuStore.js';

// ---- Metrics Table ----
export const MetricsTable = ({ section }) => {
  if (!section?.metrics?.length) return null;
  return (
    <table className="ncu-metric-table">
      <thead>
        <tr><th>Metric</th><th className="ncu-unit-col">Unit</th><th className="ncu-value-col">Value</th></tr>
      </thead>
      <tbody>
        {section.metrics.map((m, i) => {
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
      </tbody>
    </table>
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
