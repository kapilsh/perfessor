import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import useTraceStore from '../../store/traceStore';
import Card from '../common/Card';
import { formatBytes } from '../../utils/formatters';
import './MemoryCurve.css';

const MemoryCurve = () => {
  const { memoryEvents, summary } = useTraceStore();

  if (!memoryEvents || memoryEvents.length === 0) {
    return null;
  }

  // Filter for CUDA memory events and sample for performance
  const cudaEvents = memoryEvents.filter(e => e.deviceType === 1);

  if (cudaEvents.length === 0) {
    return null;
  }

  // Find the start time (minimum timestamp) to normalize
  const startTime = summary?.startTime || Math.min(...cudaEvents.map(e => e.timestamp));

  // Sample events to avoid performance issues (take every Nth event)
  const sampleRate = Math.max(1, Math.floor(cudaEvents.length / 500));
  const sampledEvents = cudaEvents.filter((_, index) => index % sampleRate === 0);

  // Prepare chart data with elapsed time in seconds
  const chartData = sampledEvents.map(event => ({
    time: (event.timestamp - startTime) / 1000000, // Convert microseconds to seconds, relative to start
    allocated: event.totalAllocated || 0,
    reserved: event.totalReserved || 0,
  }));

  // Calculate statistics
  const peakAllocated = Math.max(...chartData.map(d => d.allocated));
  const peakReserved = Math.max(...chartData.map(d => d.reserved));
  const avgAllocated = chartData.reduce((sum, d) => sum + d.allocated, 0) / chartData.length;
  const finalAllocated = chartData[chartData.length - 1]?.allocated || 0;
  const memoryEfficiency = peakReserved > 0 ? (peakAllocated / peakReserved) * 100 : 0;

  const formatTime = (value) => {
    return `${value.toFixed(1)}s`;
  };

  const formatMemory = (value) => {
    return formatBytes(value);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="memory-curve-tooltip">
          <div className="tooltip-header">
            Time: {formatTime(payload[0].payload.time)}
          </div>
          {payload.map((entry, index) => (
            <div key={index} className="tooltip-row">
              <div className="tooltip-color" style={{ background: entry.color }}></div>
              <span className="tooltip-label">{entry.name}:</span>
              <span className="tooltip-value">{formatBytes(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card title="GPU Memory Usage Over Time">
      <div className="memory-curve-header">
        <div className="memory-stats">
          <div className="memory-stat">
            <span className="stat-label">Peak Allocated</span>
            <span className="stat-value" style={{ color: '#3b82f6' }}>
              {formatBytes(peakAllocated)}
            </span>
          </div>
          <div className="memory-stat">
            <span className="stat-label">Peak Reserved</span>
            <span className="stat-value" style={{ color: '#f97316' }}>
              {formatBytes(peakReserved)}
            </span>
          </div>
          <div className="memory-stat">
            <span className="stat-label">Avg Allocated</span>
            <span className="stat-value" style={{ color: '#8b5cf6' }}>
              {formatBytes(avgAllocated)}
            </span>
          </div>
          <div className="memory-stat">
            <span className="stat-label">Memory Efficiency</span>
            <span className="stat-value" style={{ color: memoryEfficiency >= 70 ? '#4ade80' : memoryEfficiency >= 50 ? '#fbbf24' : '#f87171' }}>
              {memoryEfficiency.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="memory-description">
          Shows GPU memory allocation and reservation over time. Higher efficiency means less memory fragmentation.
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorAllocated" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorReserved" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#f97316" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3a5e" />
          <XAxis
            dataKey="time"
            stroke="#a0a0b0"
            tick={{ fill: '#a0a0b0' }}
            tickFormatter={formatTime}
            tickCount={8}
            style={{ fontSize: '0.75rem' }}
          />
          <YAxis
            stroke="#a0a0b0"
            tick={{ fill: '#a0a0b0' }}
            tickFormatter={formatMemory}
            style={{ fontSize: '0.75rem' }}
            label={{ value: 'Memory', angle: -90, position: 'insideLeft', fill: '#e0e0e0', style: { fontSize: '0.75rem' } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={peakAllocated} stroke="#3b82f6" strokeDasharray="3 3" strokeOpacity={0.5} />
          <Area
            type="monotone"
            dataKey="reserved"
            stroke="#f97316"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorReserved)"
            name="Reserved"
          />
          <Area
            type="monotone"
            dataKey="allocated"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorAllocated)"
            name="Allocated"
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="memory-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#3b82f6' }}></div>
          <span>Allocated Memory - Actually used by tensors</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#f97316' }}></div>
          <span>Reserved Memory - Total allocated by CUDA allocator</span>
        </div>
      </div>
    </Card>
  );
};

export default MemoryCurve;
