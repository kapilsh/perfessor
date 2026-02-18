import { useCallback } from 'react';
import { NcuHelpers } from '../../../utils/ncuHelpers.js';
import { NcuCharts } from '../../../utils/ncuCharts.js';
import { MetricCard, MetricsTable, SectionHints, SectionMissing } from '../NcuShared.jsx';
import NcuChart from '../NcuChart.jsx';

const NcuMemoryTab = ({ kernel }) => {
  const sec = NcuHelpers.findSection(kernel.sections, 'Memory Workload Analysis');
  if (!sec) return <SectionMissing />;

  const l1Hit = NcuHelpers.metricValue(sec, 'L1/TEX Hit Rate');
  const l2Hit = NcuHelpers.metricValue(sec, 'L2 Hit Rate');
  const maxBw = NcuHelpers.metricValue(sec, 'Max Bandwidth');

  const hierarchyFactory = useCallback(canvas => NcuCharts.memoryHierarchy(canvas, sec), [sec]);
  const barsFactory = useCallback(canvas => NcuCharts.memoryBars(canvas, sec), [sec]);

  return (
    <div>
      <h2 className="ncu-section-title">Memory Workload Analysis</h2>
      <div className="ncu-metric-cards">
        {!isNaN(l1Hit) && <MetricCard value={l1Hit.toFixed(2)} unit="%" label="L1 Hit Rate" colorClass={NcuHelpers.utilizationColor(l1Hit)} />}
        {!isNaN(l2Hit) && <MetricCard value={l2Hit.toFixed(2)} unit="%" label="L2 Hit Rate" colorClass={NcuHelpers.utilizationColor(l2Hit)} />}
        {!isNaN(maxBw) && <MetricCard value={maxBw.toFixed(2)} unit="%" label="Max Bandwidth" colorClass={NcuHelpers.utilizationColor(maxBw)} />}
      </div>
      <div className="ncu-two-col">
        <div className="ncu-chart-container">
          <h3>Memory Hierarchy</h3>
          <NcuChart factory={hierarchyFactory} height={280} />
        </div>
        <div className="ncu-chart-container">
          <h3>Memory Utilization (%)</h3>
          <NcuChart factory={barsFactory} height={280} />
        </div>
      </div>
      <MetricsTable section={sec} />
      <SectionHints section={sec} />
    </div>
  );
};

export default NcuMemoryTab;
