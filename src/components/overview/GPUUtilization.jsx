import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList } from 'recharts';
import useTraceStore from '../../store/traceStore';
import Card from '../common/Card';

const GPUUtilization = () => {
  const { gpuUtilization } = useTraceStore();

  if (gpuUtilization === undefined || gpuUtilization === null) {
    return null;
  }

  const getUtilizationColor = (util) => {
    if (util >= 70) return '#4ade80';
    if (util >= 40) return '#fbbf24';
    return '#f87171';
  };

  const data = [
    {
      name: 'GPU Utilization',
      value: gpuUtilization,
      fill: getUtilizationColor(gpuUtilization)
    }
  ];

  return (
    <Card title="GPU Utilization">
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3a5e" />
          <XAxis
            type="number"
            domain={[0, 100]}
            stroke="#a0a0b0"
            tick={{ fill: '#a0a0b0' }}
            label={{ value: 'Utilization (%)', position: 'insideBottom', offset: -5, fill: '#e0e0e0' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#a0a0b0"
            tick={{ fill: '#e0e0e0' }}
            width={110}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(value) => `${value.toFixed(1)}%`}
              style={{ fill: '#e0e0e0', fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ textAlign: 'center', marginTop: '0.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>
        {gpuUtilization >= 70 && 'Good utilization'}
        {gpuUtilization >= 40 && gpuUtilization < 70 && 'Moderate utilization'}
        {gpuUtilization < 40 && 'Low utilization - consider optimization'}
      </div>
    </Card>
  );
};

export default GPUUtilization;
