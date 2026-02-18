import { useCallback } from 'react';
import { NcuHelpers } from '../../../utils/ncuHelpers.js';
import { NcuCharts } from '../../../utils/ncuCharts.js';
import { MetricCard, MetricsTable, SectionHints, SectionMissing } from '../NcuShared.jsx';
import NcuChart from '../NcuChart.jsx';

const NcuSchedulerTab = ({ kernel }) => {
  const sec = NcuHelpers.findSection(kernel.sections, 'Scheduler Statistics');
  if (!sec) return <SectionMissing />;

  const eligible = NcuHelpers.metricValue(sec, 'One or More Eligible');
  const noEligible = NcuHelpers.metricValue(sec, 'No Eligible');
  const wps = NcuHelpers.findMetric(sec, 'Issued Warp Per Scheduler');
  const activeWarps = NcuHelpers.findMetric(sec, 'Active Warps Per Scheduler');

  const chartFactory = useCallback(canvas => NcuCharts.schedulerDonut(canvas, sec), [sec]);

  return (
    <div>
      <h2 className="ncu-section-title">Scheduler Statistics</h2>
      <div className="ncu-metric-cards">
        {!isNaN(eligible) && <MetricCard value={eligible.toFixed(2)} unit="%" label="Eligible" colorClass="ncu-color-green" />}
        {!isNaN(noEligible) && <MetricCard value={noEligible.toFixed(2)} unit="%" label="No Eligible" colorClass="ncu-color-red" />}
        {wps && <MetricCard value={wps.value} unit="" label="Issued Warp/Scheduler" colorClass="ncu-color-blue" />}
        {activeWarps && <MetricCard value={activeWarps.value} unit={activeWarps.unit} label="Active Warps/Scheduler" colorClass="ncu-color-blue" />}
      </div>
      <div className="ncu-two-col">
        <div className="ncu-chart-container">
          <h3>Eligible vs No Eligible</h3>
          <NcuChart factory={chartFactory} height={280} />
        </div>
        <div>
          <MetricsTable section={sec} />
        </div>
      </div>
      <SectionHints section={sec} />
    </div>
  );
};

export default NcuSchedulerTab;
