import { useCallback } from 'react';
import { NcuHelpers } from '../../../utils/ncuHelpers.js';
import { NcuCharts } from '../../../utils/ncuCharts.js';
import { MetricCard, MetricsTable, SectionHints, SectionMissing } from '../NcuShared.jsx';
import NcuChart from '../NcuChart.jsx';

const NcuComputeTab = ({ kernel }) => {
  const sec = NcuHelpers.findSection(kernel.sections, 'Compute Workload Analysis');
  if (!sec) return <SectionMissing />;

  const smBusy = NcuHelpers.metricValue(sec, 'SM Busy');
  const issueSlots = NcuHelpers.metricValue(sec, 'Issue Slots Busy');

  const ipcFactory = useCallback(canvas => {
    const labels = [], values = [];
    ['Executed Ipc Active', 'Executed Ipc Elapsed', 'Issued Ipc Active'].forEach(name => {
      const val = NcuHelpers.metricValue(sec, name);
      if (!isNaN(val)) { labels.push(name); values.push(val); }
    });
    if (!labels.length) return null;
    return NcuCharts.horizontalBar(canvas, labels, values, { unit: 'inst/cycle' });
  }, [sec]);

  return (
    <div>
      <h2 className="ncu-section-title">Compute Workload Analysis</h2>
      <div className="ncu-metric-cards">
        {!isNaN(smBusy) && <MetricCard value={smBusy.toFixed(2)} unit="%" label="SM Busy" colorClass={NcuHelpers.utilizationColor(smBusy)} />}
        {!isNaN(issueSlots) && <MetricCard value={issueSlots.toFixed(2)} unit="%" label="Issue Slots Busy" colorClass={NcuHelpers.utilizationColor(issueSlots)} />}
      </div>
      <div className="ncu-two-col">
        <div className="ncu-chart-container">
          <h3>IPC Metrics</h3>
          <NcuChart factory={ipcFactory} height={220} />
        </div>
        <div>
          <MetricsTable section={sec} />
        </div>
      </div>
      <SectionHints section={sec} />
    </div>
  );
};

export default NcuComputeTab;
