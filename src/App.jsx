import { Component, lazy, Suspense, useState } from 'react';
import useTraceStore from './store/traceStore';
import useNcuStore from './store/ncuStore';
import FileUploader from './components/FileUploader';
import TraceViewer from './components/TraceViewer';
import TraceSelector from './components/TraceSelector';
import AddTraceButton from './components/AddTraceButton';
import UpdateBanner from './components/UpdateBanner';
import './App.css';

const NcuView = lazy(() => import('./components/ncu/NcuView'));

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button onClick={() => window.location.reload()}>Reload Page</button>
          <style>{`
            .error-boundary {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: #111827;
              color: #f3f4f6;
              padding: 1rem;
              text-align: center;
              max-width: 100vw;
              overflow-x: hidden;
              box-sizing: border-box;
            }

            .error-boundary h2 {
              margin: 0 0 1rem 0;
              color: #ef4444;
              font-size: clamp(1.25rem, 4vw, 1.5rem);
            }

            .error-boundary p {
              margin: 0 0 2rem 0;
              color: #9ca3af;
              font-size: clamp(0.875rem, 3vw, 1rem);
              max-width: 600px;
            }

            .error-boundary button {
              padding: 0.75rem 2rem;
              background: #6366f1;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 1rem;
              font-weight: 500;
            }

            .error-boundary button:hover {
              background: #4f46e5;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppContent = () => {
  const { traces, fileName, isLoading, error, progress } = useTraceStore();
  const { files: ncuFiles, isLoading: ncuLoading, error: ncuError } = useNcuStore();
  const [activeMode, setActiveMode] = useState('trace'); // 'trace' | 'ncu'
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const hasTraces = traces.length > 0;
  const hasNcu = ncuFiles.length > 0;

  // Auto-switch to NCU mode when first NCU file is loaded and no trace is active
  // (handled by rendering logic below)

  if (isLoading || ncuLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner-large" />
        <h2>Processing trace file...</h2>
        {progress ? (
          <>
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${progress.percent}%` }} />
            </div>
            <p className="progress-message">{progress.message}</p>
            <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              {progress.stage} - {progress.percent.toFixed(1)}%
            </p>
          </>
        ) : (
          <p>This may take a moment for large files</p>
        )}
        <style>{`
          .loading-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #111827;
            color: #f3f4f6;
            padding: 1rem;
            max-width: 100vw;
            overflow-x: hidden;
            box-sizing: border-box;
          }

          .spinner-large {
            width: 60px;
            height: 60px;
            border: 6px solid #374151;
            border-top-color: #6366f1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 2rem;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .loading-screen h2 {
            margin: 0 0 0.5rem 0;
            font-size: clamp(1.25rem, 4vw, 1.5rem);
          }

          .loading-screen p {
            margin: 0;
            color: #9ca3af;
            font-size: clamp(0.875rem, 3vw, 1rem);
            text-align: center;
          }

          .progress-bar-container {
            width: 100%;
            max-width: 500px;
            height: 8px;
            background: #374151;
            border-radius: 4px;
            overflow: hidden;
            margin: 1.5rem 0 0.75rem 0;
          }

          .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #6366f1, #8b5cf6);
            transition: width 0.3s ease;
            border-radius: 4px;
          }

          .progress-message {
            font-size: 0.9rem;
            color: #d1d5db;
            margin-top: 0.5rem;
          }
        `}</style>
      </div>
    );
  }

  if (error || ncuError) {
    return (
      <div className="error-screen">
        <div className="error-icon">⚠</div>
        <h2>Error Processing File</h2>
        <p>{error || ncuError}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
        <style>{`
          .error-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #111827;
            color: #f3f4f6;
            padding: 1rem;
            text-align: center;
            max-width: 100vw;
            overflow-x: hidden;
            box-sizing: border-box;
          }

          .error-icon {
            font-size: clamp(3rem, 8vw, 4rem);
            margin-bottom: 1rem;
            color: #ef4444;
          }

          .error-screen h2 {
            margin: 0 0 1rem 0;
            color: #ef4444;
            font-size: clamp(1.25rem, 4vw, 1.5rem);
          }

          .error-screen p {
            margin: 0 0 2rem 0;
            color: #9ca3af;
            max-width: 600px;
            font-size: clamp(0.875rem, 3vw, 1rem);
            padding: 0 1rem;
          }

          .error-screen button {
            padding: 0.75rem 2rem;
            background: #6366f1;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 500;
          }

          .error-screen button:hover {
            background: #4f46e5;
          }
        `}</style>
      </div>
    );
  }

  if (!hasTraces && !hasNcu) {
    return <FileUploader />;
  }

  // Determine effective mode: default to ncu if no traces, trace if no ncu files
  const effectiveMode = hasTraces && hasNcu
    ? activeMode
    : hasNcu ? 'ncu' : 'trace';

  const ncuFileName = hasNcu ? ncuFiles[ncuFiles.length - 1].fileName : null;

  const displayFileName = effectiveMode === 'trace' ? fileName : ncuFileName;

  const toggleSidebar = () => setSidebarOpen(o => !o);

  return (
    <div className="app-with-traces">
      <header className="app-trace-header">
        <div className="header-left">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Perfessor Logo" className="app-logo" />
          <h1>Perfessor</h1>

          {(hasTraces || hasNcu) && (
            <>
              <div className="header-divider" />
              <button
                className={`sidebar-panel-btn ${sidebarOpen ? 'active' : ''}`}
                onClick={toggleSidebar}
                title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <rect x="0" y="0" width="4" height="14" rx="1" fill="#9ca3af"/>
                  <rect x="5.5" y="0" width="8.5" height="14" rx="1" fill="#9ca3af"/>
                </svg>
              </button>
              <div className="app-mode-switcher">
                {(hasTraces || !hasNcu) && (
                  <button
                    className={`mode-btn ${effectiveMode === 'trace' ? 'active' : ''}`}
                    onClick={() => setActiveMode('trace')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                    PyTorch Trace
                  </button>
                )}
                {(hasNcu || !hasTraces) && (
                  <button
                    className={`mode-btn ${effectiveMode === 'ncu' ? 'active' : ''}`}
                    onClick={() => setActiveMode('ncu')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <path d="M8 21h8M12 17v4" />
                    </svg>
                    NCU Report
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="header-right">
          {displayFileName && <span className="file-name">{displayFileName}</span>}
          <AddTraceButton />
        </div>
      </header>

      {effectiveMode === 'ncu' ? (
        <div className="app-ncu-body">
          <Suspense fallback={<div style={{ padding: '2rem', color: '#9ca3af' }}>Loading NCU viewer...</div>}>
            <NcuView sidebarOpen={sidebarOpen} />
          </Suspense>
        </div>
      ) : (
        <div className="app-body">
          {sidebarOpen && (
            <div className="app-sidebar">
              <TraceSelector />
            </div>
          )}
          <div className="app-main">
            <TraceViewer />
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <UpdateBanner />
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
