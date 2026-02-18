import useNcuStore from '../../../store/ncuStore.js';
import { NcuHelpers } from '../../../utils/ncuHelpers.js';
import { MetricCard, HintBox, SectionMissing } from '../NcuShared.jsx';

// Comparison view when compare mode is active with multiple kernels selected
const ComparisonOverview = ({ compareKernels, getKernelSummary }) => {
  const keyMetrics = [
    { name: 'Duration', section: 'GPU Speed Of Light Throughput' },
    { name: 'Compute (SM) Throughput', section: 'GPU Speed Of Light Throughput' },
    { name: 'Memory Throughput', section: 'GPU Speed Of Light Throughput' },
    { name: 'Theoretical Occupancy', section: 'Occupancy' },
    { name: 'Achieved Occupancy', section: 'Occupancy' },
    { name: 'SM Busy', section: 'Compute Workload Analysis' },
    { name: 'L1/TEX Hit Rate', section: 'Memory Workload Analysis' },
    { name: 'L2 Hit Rate', section: 'Memory Workload Analysis' },
  ];

  return (
    <div>
      <h2 className="ncu-section-title">Kernel Comparison</h2>
      <div className="ncu-comparison-grid">
        <div className="ncu-comparison-header">
          <div className="ncu-comparison-metric-label">Metric</div>
          {compareKernels.map((ck, i) => {
            const s = getKernelSummary(ck.kernel);
            return <div key={i} className="ncu-comparison-kernel-header" title={ck.kernel.name}>{s.shortName}</div>;
          })}
        </div>
        {keyMetrics.map((metric, mi) => {
          const values = compareKernels.map(ck => {
            const sec = NcuHelpers.findSection(ck.kernel.sections, metric.section);
            if (!sec) return null;
            const m = NcuHelpers.findMetric(sec, metric.name);
            return m ? { display: `${m.value} ${m.unit}`, raw: NcuHelpers.toNumber(m.value) } : null;
          });

          const numVals = values.map(v => v?.raw).filter(v => !isNaN(v) && v != null);
          const minVal = numVals.length ? Math.min(...numVals) : null;
          const maxVal = numVals.length ? Math.max(...numVals) : null;
          const lowerIsBetter = metric.name.includes('Duration');

          return (
            <div key={mi} className="ncu-comparison-row">
              <div className="ncu-comparison-metric-label">{metric.name}</div>
              {values.map((v, vi) => {
                let cls = '';
                if (v && numVals.length > 1 && !isNaN(v.raw)) {
                  const isBest = lowerIsBetter ? v.raw === minVal : v.raw === maxVal;
                  const isWorst = lowerIsBetter ? v.raw === maxVal : v.raw === minVal;
                  if (isBest) cls = 'ncu-comparison-best';
                  else if (isWorst) cls = 'ncu-comparison-worst';
                }
                return (
                  <div key={vi} className={`ncu-comparison-cell ${cls}`}>
                    {v ? v.display : '—'}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const NcuOverviewTab = ({ kernel }) => {
  const { compareMode, compareKernels, getKernelSummary } = useNcuStore();

  if (compareMode && compareKernels.length > 1) {
    return <ComparisonOverview compareKernels={compareKernels} getKernelSummary={getKernelSummary} />;
  }

  const sol = NcuHelpers.findSection(kernel.sections, 'GPU Speed Of Light Throughput');
  const occ = NcuHelpers.findSection(kernel.sections, 'Occupancy');
  const compute = NcuHelpers.findSection(kernel.sections, 'Compute Workload Analysis');

  const summary = getKernelSummary(kernel);

  const cards = [];
  if (sol) {
    const dur = NcuHelpers.findMetric(sol, 'Duration');
    if (dur) cards.push(<MetricCard key="dur" value={dur.value} unit={dur.unit} label="Duration" colorClass="ncu-color-blue" />);
    const ct = NcuHelpers.findMetric(sol, 'Compute (SM) Throughput');
    if (ct) cards.push(<MetricCard key="ct" value={ct.value} unit={ct.unit} label="Compute Throughput" colorClass={NcuHelpers.utilizationColor(ct.value)} />);
    const mt = NcuHelpers.findMetric(sol, 'Memory Throughput');
    if (mt) cards.push(<MetricCard key="mt" value={mt.value} unit={mt.unit} label="Memory Throughput" colorClass={NcuHelpers.utilizationColor(mt.value)} />);
    const freq = NcuHelpers.findMetric(sol, 'SM Frequency');
    if (freq) cards.push(<MetricCard key="freq" value={freq.value} unit={freq.unit} label="SM Frequency" colorClass="ncu-color-blue" />);
  }
  if (compute) {
    const smb = NcuHelpers.findMetric(compute, 'SM Busy');
    if (smb) cards.push(<MetricCard key="smb" value={smb.value} unit={smb.unit} label="SM Busy" colorClass={NcuHelpers.utilizationColor(smb.value)} />);
    const ipc = NcuHelpers.findMetric(compute, 'Executed Ipc Active');
    if (ipc) cards.push(<MetricCard key="ipc" value={ipc.value} unit={ipc.unit} label="IPC (Active)" colorClass="ncu-color-blue" />);
  }
  if (occ) {
    const to = NcuHelpers.findMetric(occ, 'Theoretical Occupancy');
    if (to) cards.push(<MetricCard key="to" value={to.value} unit={to.unit} label="Theoretical Occupancy" colorClass={NcuHelpers.utilizationColor(to.value)} />);
    const ao = NcuHelpers.findMetric(occ, 'Achieved Occupancy');
    if (ao) cards.push(<MetricCard key="ao" value={ao.value} unit={ao.unit} label="Achieved Occupancy" colorClass={NcuHelpers.utilizationColor(ao.value)} />);
  }

  return (
    <div>
      <h2 className="ncu-section-title">Overview: {summary.shortName}</h2>
      <div className="ncu-kernel-meta">
        Grid: ({kernel.grid}) &nbsp; Block: ({kernel.block}) &nbsp; CC: {kernel.cc} &nbsp;
        Type: {NcuHelpers.classifyKernel(kernel.name)}
      </div>
      <div className="ncu-metric-cards">{cards}</div>

      <h3 className="ncu-subsection-title">Optimization Hints</h3>
      {kernel.sections.some(s => s.hints.length > 0) ? (
        kernel.sections.flatMap((sec, si) => sec.hints.map((h, hi) => (
          <HintBox key={`${si}-${hi}`} type={h.type} text={h.text} sectionName={sec.name} />
        )))
      ) : (
        <p className="ncu-empty-msg">No hints for this kernel.</p>
      )}
    </div>
  );
};

export default NcuOverviewTab;
