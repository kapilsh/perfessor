import { lazy, Suspense } from 'react';
import useTraceStore from '../store/traceStore';
import Navigation from './Navigation';
import LoadingSpinner from './common/LoadingSpinner';
import ErrorBoundary from './common/ErrorBoundary';
import './TraceViewer.css';

const OverviewView = lazy(() => import('./overview/OverviewView'));
const OperatorView = lazy(() => import('./operator/OperatorView'));
const KernelView = lazy(() => import('./kernel/KernelView'));
const TraceView = lazy(() => import('./trace/TraceView'));
const MemoryView = lazy(() => import('./memory/MemoryView'));
const ModuleView = lazy(() => import('./module/ModuleView'));

const TraceViewer = () => {
  const { currentView } = useTraceStore();

  return (
    <div className="trace-viewer">
      <Navigation />

      <main className="trace-content">
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner message="Loading view..." />}>
            {currentView === 'overview' && <OverviewView />}
            {currentView === 'operators' && <OperatorView />}
            {currentView === 'kernels' && <KernelView />}
            {currentView === 'trace' && <TraceView />}
            {currentView === 'memory' && <MemoryView />}
            {currentView === 'modules' && <ModuleView />}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default TraceViewer;
