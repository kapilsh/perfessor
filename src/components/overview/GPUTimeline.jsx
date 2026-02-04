import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import useTraceStore from '../../store/traceStore';
import Card from '../common/Card';
import { isGPUEvent } from '../../utils/eventClassifier';
import './GPUTimeline.css';

const GPUTimeline = () => {
  const { events, summary } = useTraceStore();

  if (!events || events.length === 0 || !summary) {
    return null;
  }

  // Filter GPU events
  const gpuEvents = events.filter(e => e.ph === 'X' && isGPUEvent(e) && e.dur > 0);

  if (gpuEvents.length === 0) {
    return null;
  }

  const startTime = summary.startTime;
  const endTime = summary.endTime;
  const totalDuration = endTime - startTime;

  // Divide timeline into bins (150 bins for smoother visualization)
  const numBins = 150;
  const binSize = totalDuration / numBins;

  // Initialize bins
  const bins = Array.from({ length: numBins }, (_, i) => ({
    binIndex: i,
    binStart: startTime + i * binSize,
    binEnd: startTime + (i + 1) * binSize,
    activeTime: 0,
  }));

  // For each GPU event, add its duration to the bins it overlaps
  gpuEvents.forEach(event => {
    const eventStart = event.ts;
    const eventEnd = event.ts + event.dur;

    // Find which bins this event overlaps
    const startBinIndex = Math.floor((eventStart - startTime) / binSize);
    const endBinIndex = Math.floor((eventEnd - startTime) / binSize);

    for (let i = Math.max(0, startBinIndex); i <= Math.min(numBins - 1, endBinIndex); i++) {
      const bin = bins[i];

      // Calculate overlap between event and bin
      const overlapStart = Math.max(eventStart, bin.binStart);
      const overlapEnd = Math.min(eventEnd, bin.binEnd);
      const overlapDuration = overlapEnd - overlapStart;

      if (overlapDuration > 0) {
        bin.activeTime += overlapDuration;
      }
    }
  });

  // Calculate utilization percentage for each bin
  const chartData = bins.map((bin, index) => {
    const utilization = (bin.activeTime / binSize) * 100;
    // Cap at 100% in case of overlapping streams
    return {
      index,
      time: (bin.binStart - startTime) / 1000000, // Convert to seconds
      utilization: Math.min(100, utilization),
    };
  });

  // Calculate statistics
  const avgUtilization = chartData.reduce((sum, d) => sum + d.utilization, 0) / chartData.length;
  const idleBins = chartData.filter(d => d.utilization < 10).length;
  const idlePercent = (idleBins / chartData.length) * 100;
  const activeBins = chartData.filter(d => d.utilization >= 70).length;
  const activePercent = (activeBins / chartData.length) * 100;

  const formatTime = (value) => {
    return `${value.toFixed(1)}s`;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="gpu-timeline-tooltip">
          <div className="tooltip-row">
            <span className="tooltip-label">Time:</span>
            <span className="tooltip-value">{data.time.toFixed(2)}s</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">GPU Active:</span>
            <span className="tooltip-value">{data.utilization.toFixed(1)}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Gradient colors for area
  const getGradientColor = () => {
    if (avgUtilization >= 70) return { start: '#10b98180', stop: '#10b981' };
    if (avgUtilization >= 40) return { start: '#f59e0b80', stop: '#f59e0b' };
    return { start: '#ef444480', stop: '#ef4444' };
  };

  const gradientColor = getGradientColor();

  return (
    <Card title="GPU Activity Timeline">
      <div className="gpu-timeline-header">
        <div className="timeline-stats">
          <div className="timeline-stat">
            <span className="stat-label">Avg Utilization</span>
            <span className="stat-value" style={{ color: avgUtilization >= 70 ? '#10b981' : avgUtilization >= 40 ? '#f59e0b' : '#ef4444' }}>
              {avgUtilization.toFixed(1)}%
            </span>
          </div>
          <div className="timeline-stat">
            <span className="stat-label">High Activity</span>
            <span className="stat-value" style={{ color: '#10b981' }}>
              {activePercent.toFixed(0)}%
            </span>
          </div>
          <div className="timeline-stat">
            <span className="stat-label">Idle Time</span>
            <span className="stat-value" style={{ color: '#ef4444' }}>
              {idlePercent.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="timeline-description">
          Timeline shows GPU kernel execution over time. Higher values indicate better utilization.
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorUtilization" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={gradientColor.stop} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={gradientColor.start} stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} />
          <XAxis
            dataKey="time"
            stroke="#9ca3af"
            tickFormatter={formatTime}
            tickCount={10}
            style={{ fontSize: '0.75rem' }}
          />
          <YAxis
            stroke="#9ca3af"
            domain={[0, 100]}
            style={{ fontSize: '0.75rem' }}
            label={{ value: 'GPU Active (%)', angle: -90, position: 'insideLeft', fill: '#9ca3af', style: { fontSize: '0.75rem' } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={70} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.3} />
          <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.3} />
          <Area
            type="monotone"
            dataKey="utilization"
            stroke={gradientColor.stop}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorUtilization)"
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="timeline-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#10b981' }}></div>
          <span>Good (&gt;70%)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#f59e0b' }}></div>
          <span>Moderate (40-70%)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#ef4444' }}></div>
          <span>Low (&lt;40%)</span>
        </div>
      </div>
    </Card>
  );
};

export default GPUTimeline;
