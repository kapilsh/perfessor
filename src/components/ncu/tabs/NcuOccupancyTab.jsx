import { useCallback } from 'react';
import { NcuHelpers } from '../../../utils/ncuHelpers.js';
import { NcuCharts } from '../../../utils/ncuCharts.js';
import { MetricCard, MetricsTable, SectionHints, SectionMissing } from '../NcuShared.jsx';
import NcuChart from '../NcuChart.jsx';

const NcuOccupancyTab = ({ kernel }) => {
  const sec = NcuHelpers.findSection(kernel.sections, 'Occupancy');
  if (!sec) return <SectionMissing />;

  const theoretical = NcuHelpers.metricValue(sec, 'Theoretical Occupancy');
  const achieved = NcuHelpers.metricValue(sec, 'Achieved Occupancy');

  const chartFactory = useCallback(canvas => NcuCharts.occupancy(canvas, sec), [sec]);

  return (
    <div>
      <h2 className="ncu-section-title">Occupancy</h2>
      <div className="ncu-metric-cards">
        {!isNaN(theoretical) && <MetricCard value={theoretical.toFixed(2)} unit="%" label="Theoretical Occupancy" colorClass={NcuHelpers.utilizationColor(theoretical)} />}
        {!isNaN(achieved) && <MetricCard value={achieved.toFixed(2)} unit="%" label="Achieved Occupancy" colorClass={NcuHelpers.utilizationColor(achieved)} />}
      </div>
      <div className="ncu-chart-container">
        <h3>Block Limits &amp; Occupancy</h3>
        <NcuChart factory={chartFactory} height={350} />
      </div>
      <MetricsTable section={sec} />
      <SectionHints section={sec} />
    </div>
  );
};

export default NcuOccupancyTab;
