import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell, LabelList } from 'recharts';
import useTraceStore from '../../store/traceStore';
import Card from '../common/Card';
import { getStepTimeColor } from '../../utils/colorSchemes';
import { formatDuration } from '../../utils/formatters';
import './StepTimeBreakdown.css';

const StepTimeBreakdown = () => {
  const { stepTimeBreakdown, summary } = useTraceStore();

  if (!stepTimeBreakdown || stepTimeBreakdown.length === 0) {
    return null;
  }

  const data = stepTimeBreakdown
    .filter(item => item.time > 0)
    .sort((a, b) => b.time - a.time);

  if (data.length === 0) {
    return null;
  }

  // Get percentages from the data (already calculated correctly)
  const kernelPercent = data.find(d => d.name === 'Kernel')?.percentage || 0;
  const cpuPercent = data.find(d => d.name === 'CPU Exec')?.percentage || 0;
  const memcpyPercent = data.find(d => d.name === 'Memcpy')?.percentage || 0;
  const memsetPercent = data.find(d => d.name === 'Memset')?.percentage || 0;
  const memoryPercent = memcpyPercent + memsetPercent;
  const dataLoaderPercent = data.find(d => d.name === 'DataLoader')?.percentage || 0;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="step-breakdown-tooltip">
          <div className="tooltip-header">{data.name}</div>
          <div className="tooltip-row">
            <span className="tooltip-label">Time:</span>
            <span className="tooltip-value">{formatDuration(data.time)}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Percentage:</span>
            <span className="tooltip-value">{data.percentage.toFixed(1)}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card title="Step Time Breakdown">
      <div className="step-breakdown-header">
        <div className="breakdown-stats">
          <div className="breakdown-stat">
            <span className="stat-label">Kernel Time</span>
            <span className="stat-value" style={{ color: getStepTimeColor('Kernel') }}>
              {kernelPercent.toFixed(1)}%
            </span>
          </div>
          <div className="breakdown-stat">
            <span className="stat-label">CPU Time</span>
            <span className="stat-value" style={{ color: getStepTimeColor('CPU Exec') }}>
              {cpuPercent.toFixed(1)}%
            </span>
          </div>
          <div className="breakdown-stat">
            <span className="stat-label">Memory Ops</span>
            <span className="stat-value" style={{ color: getStepTimeColor('Memcpy') }}>
              {memoryPercent.toFixed(1)}%
            </span>
          </div>
          <div className="breakdown-stat">
            <span className="stat-label">Data Loading</span>
            <span className="stat-value" style={{ color: getStepTimeColor('DataLoader') }}>
              {dataLoaderPercent.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="breakdown-description">
          Time breakdown by operation category. Higher kernel time indicates better GPU utilization.
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 120, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} />
          <XAxis
            type="number"
            stroke="#9ca3af"
            style={{ fontSize: '0.75rem' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#9ca3af"
            width={110}
            style={{ fontSize: '0.875rem' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="time" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getStepTimeColor(entry.name)} />
            ))}
            <LabelList
              dataKey="percentage"
              position="right"
              formatter={(value) => `${value.toFixed(1)}%`}
              style={{ fill: '#f3f4f6', fontSize: '0.75rem', fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="breakdown-legend">
        {data.slice(0, 4).map((item) => (
          <div key={item.name} className="legend-item">
            <div className="legend-color" style={{ background: getStepTimeColor(item.name) }}></div>
            <span>{item.name}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default StepTimeBreakdown;
