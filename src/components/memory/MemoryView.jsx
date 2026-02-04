import useTraceStore from '../../store/traceStore';
import Card from '../common/Card';
import MemorySummary from './MemorySummary';
import MemoryCurve from './MemoryCurve';
import { formatBytes, formatDuration } from '../../utils/formatters';
import './MemoryView.css';

const MemoryView = () => {
  const { memoryEvents } = useTraceStore();

  if (!memoryEvents || memoryEvents.length === 0) {
    return (
      <div className="view-container">
        <Card>
          <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
            <h3>No Memory Data Available</h3>
            <p>This trace does not contain memory allocation information.</p>
            <p style={{ fontSize: '0.875rem', marginTop: '1rem' }}>
              To capture memory events, profile with memory tracking enabled:
            </p>
            <pre style={{
              background: '#1f2937',
              padding: '1rem',
              borderRadius: '6px',
              textAlign: 'left',
              marginTop: '1rem',
              fontSize: '0.8rem'
            }}>
              {`prof = torch.profiler.profile(
  record_shapes=True,
  profile_memory=True,  # Enable this
  with_stack=True
)`}
            </pre>
          </div>
        </Card>
      </div>
    );
  }

  const getDeviceTypeName = (deviceType) => {
    if (deviceType === 0) return 'CPU';
    if (deviceType === 1) return 'CUDA';
    return 'Unknown';
  };

  const getOperationType = (bytes) => {
    if (bytes > 0) return 'Alloc';
    if (bytes < 0) return 'Free';
    return 'N/A';
  };

  return (
    <div className="memory-view">
      <MemorySummary />
      <MemoryCurve />
      <Card title="Memory Events">
        <div className="memory-table-container">
          <table className="memory-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Type</th>
                <th>Device</th>
                <th>Operation</th>
                <th>Bytes</th>
                <th>Total Allocated</th>
                <th>Total Reserved</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              {memoryEvents.slice(0, 500).map((event, index) => (
                <tr key={index}>
                  <td>{formatDuration(event.timestamp)}</td>
                  <td>{event.name}</td>
                  <td>
                    {event.deviceType !== undefined ? (
                      <span className={`device-badge ${getDeviceTypeName(event.deviceType).toLowerCase()}`}>
                        {getDeviceTypeName(event.deviceType)}
                        {event.deviceId !== undefined && event.deviceId >= 0 && `:${event.deviceId}`}
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    {event.bytes !== undefined && (
                      <span className={`op-type ${getOperationType(event.bytes).toLowerCase()}`}>
                        {getOperationType(event.bytes)}
                      </span>
                    )}
                  </td>
                  <td>{event.bytes !== undefined ? formatBytes(Math.abs(event.bytes)) : '-'}</td>
                  <td>{event.totalAllocated !== undefined ? formatBytes(event.totalAllocated) : '-'}</td>
                  <td>{event.totalReserved !== undefined ? formatBytes(event.totalReserved) : '-'}</td>
                  <td className="addr-cell">
                    {event.addr ? `0x${event.addr.toString(16)}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {memoryEvents.length > 500 && (
          <div className="memory-note">
            Showing first 500 of {memoryEvents.length} memory events
          </div>
        )}
      </Card>
    </div>
  );
};

export default MemoryView;
