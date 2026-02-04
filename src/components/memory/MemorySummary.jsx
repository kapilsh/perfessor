import useTraceStore from '../../store/traceStore';
import Card from '../common/Card';
import { formatBytes } from '../../utils/formatters';
import './MemorySummary.css';

const MemorySummary = () => {
  const { memoryEvents } = useTraceStore();

  if (!memoryEvents || memoryEvents.length === 0) {
    return null;
  }

  // Calculate statistics for CUDA memory
  const cudaEvents = memoryEvents.filter(e => e.deviceType === 1);
  const cpuEvents = memoryEvents.filter(e => e.deviceType === 0);

  const getStats = (events) => {
    if (events.length === 0) return null;

    const peakAllocated = Math.max(...events.map(e => e.totalAllocated || 0));
    const peakReserved = Math.max(...events.map(e => e.totalReserved || 0));
    const totalAllocations = events.filter(e => e.bytes > 0).length;
    const totalDeallocations = events.filter(e => e.bytes < 0).length;

    return {
      peakAllocated,
      peakReserved,
      totalAllocations,
      totalDeallocations,
    };
  };

  const cudaStats = getStats(cudaEvents);
  const cpuStats = getStats(cpuEvents);

  return (
    <div className="memory-summary-grid">
      {cudaStats && (
        <Card title="GPU Memory Summary">
          <div className="memory-stats">
            <div className="memory-stat">
              <span className="stat-label">Peak Allocated</span>
              <span className="stat-value">{formatBytes(cudaStats.peakAllocated)}</span>
            </div>
            <div className="memory-stat">
              <span className="stat-label">Peak Reserved</span>
              <span className="stat-value">{formatBytes(cudaStats.peakReserved)}</span>
            </div>
            <div className="memory-stat">
              <span className="stat-label">Allocations</span>
              <span className="stat-value">{cudaStats.totalAllocations.toLocaleString()}</span>
            </div>
            <div className="memory-stat">
              <span className="stat-label">Deallocations</span>
              <span className="stat-value">{cudaStats.totalDeallocations.toLocaleString()}</span>
            </div>
          </div>
        </Card>
      )}

      {cpuStats && (
        <Card title="CPU Memory Summary">
          <div className="memory-stats">
            <div className="memory-stat">
              <span className="stat-label">Peak Allocated</span>
              <span className="stat-value">{formatBytes(cpuStats.peakAllocated)}</span>
            </div>
            <div className="memory-stat">
              <span className="stat-label">Peak Reserved</span>
              <span className="stat-value">{formatBytes(cpuStats.peakReserved)}</span>
            </div>
            <div className="memory-stat">
              <span className="stat-label">Allocations</span>
              <span className="stat-value">{cpuStats.totalAllocations.toLocaleString()}</span>
            </div>
            <div className="memory-stat">
              <span className="stat-label">Deallocations</span>
              <span className="stat-value">{cpuStats.totalDeallocations.toLocaleString()}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MemorySummary;
