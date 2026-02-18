import { useCallback } from 'react';
import { NcuHelpers } from '../../../utils/ncuHelpers.js';
import { NcuCharts } from '../../../utils/ncuCharts.js';
import { MetricsTable, SectionHints, SectionMissing } from '../NcuShared.jsx';
import NcuChart from '../NcuChart.jsx';

const NcuSolTab = ({ kernel }) => {
  const sec = NcuHelpers.findSection(kernel.sections, 'GPU Speed Of Light Throughput');
  if (!sec) return <SectionMissing />;

  const solFactory = useCallback(canvas => NcuCharts.speedOfLight(canvas, sec), [sec]);
  const rooflineFactory = useCallback(canvas => NcuCharts.roofline(canvas, sec), [sec]);

  const rooflineSection = kernel.sections.find(s => s.name === 'Roofline');

  return (
    <div>
      <h2 className="ncu-section-title">GPU Speed Of Light Throughput</h2>
      <div className="ncu-two-col">
        <div className="ncu-chart-container">
          <h3>Throughput (% of Peak)</h3>
          <NcuChart factory={solFactory} height={250} />
        </div>
        <div className="ncu-chart-container">
          <h3>Roofline Analysis</h3>
          <NcuChart factory={rooflineFactory} height={250} />
        </div>
      </div>
      <MetricsTable section={sec} />
      <SectionHints section={sec} />
      {rooflineSection?.hints?.map((h, i) => (
        <div key={i} className={`ncu-hint-box ${h.type === 'OPT' ? 'ncu-hint-opt' : 'ncu-hint-inf'}`}>
          <span className="ncu-hint-label">{h.type === 'OPT' ? 'OPT' : 'INF'}</span>
          {h.text}
        </div>
      ))}
    </div>
  );
};

export default NcuSolTab;
