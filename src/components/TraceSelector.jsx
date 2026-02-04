import useTraceStore from '../store/traceStore';
import './TraceSelector.css';

const TraceSelector = () => {
  const { traces, activeTraceId, setActiveTrace, removeTrace } = useTraceStore();

  if (traces.length === 0) {
    return null;
  }

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (microseconds) => {
    const ms = microseconds / 1000;
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const handleTraceSelect = (traceId) => {
    setActiveTrace(traceId);
  };

  const handleTraceRemove = (e, traceId) => {
    e.stopPropagation();
    removeTrace(traceId);
  };

  return (
    <div className="trace-list">
      {traces.map((trace) => (
        <div
          key={trace.id}
          className={`trace-list-item ${trace.id === activeTraceId ? 'active' : ''}`}
          onClick={() => handleTraceSelect(trace.id)}
        >
          <div className="trace-list-item-header">
            <svg
              className="trace-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="trace-list-item-name" title={trace.fileName}>
              {trace.fileName}
            </span>
            <button
              className="trace-list-item-remove"
              onClick={(e) => handleTraceRemove(e, trace.id)}
              title="Remove trace"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="trace-list-item-meta">
            <span className="trace-meta-item">{formatDate(trace.uploadedAt)}</span>
            <span className="trace-meta-separator">•</span>
            <span className="trace-meta-item">{formatDuration(trace.summary?.totalDuration || 0)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TraceSelector;
