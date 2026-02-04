import useTraceStore from '../../store/traceStore';
import Card from '../common/Card';
import SummaryCards from './SummaryCards';
import StepTimeBreakdown from './StepTimeBreakdown';
import PerformanceRecommendations from './PerformanceRecommendations';
import GPUTimeline from './GPUTimeline';
import './OverviewView.css';

const OverviewView = () => {
  const {
    summary,
    gpuInfo,
    stepTimeBreakdown,
    gpuUtilization,
    recommendations,
  } = useTraceStore();

  if (!summary) {
    return (
      <div className="view-container">
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="overview-view">
      <div className="overview-grid">
        <SummaryCards />

        {gpuInfo && gpuInfo.name && (
          <Card title="GPU Information">
            <div className="gpu-info">
              <div className="info-row">
                <span className="info-label">Device:</span>
                <span className="info-value">{gpuInfo.name}</span>
              </div>
              {gpuInfo.memory > 0 && (
                <div className="info-row">
                  <span className="info-label">Memory:</span>
                  <span className="info-value">
                    {(gpuInfo.memory / (1024 ** 3)).toFixed(2)} GB
                  </span>
                </div>
              )}
              {gpuInfo.computeCapability && gpuInfo.computeCapability !== 'Unknown' && (
                <div className="info-row">
                  <span className="info-label">Compute Capability:</span>
                  <span className="info-value">{gpuInfo.computeCapability}</span>
                </div>
              )}
            </div>
          </Card>
        )}

        <GPUTimeline />

        <StepTimeBreakdown />

        <PerformanceRecommendations />
      </div>
    </div>
  );
};

export default OverviewView;
