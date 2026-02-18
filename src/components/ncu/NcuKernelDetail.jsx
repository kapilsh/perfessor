import { lazy, Suspense } from 'react';
import useNcuStore from '../../store/ncuStore.js';
import { NcuHelpers } from '../../utils/ncuHelpers.js';

const NcuSummaryTab = lazy(() => import('./tabs/NcuSummaryTab.jsx'));
const NcuSessionTab = lazy(() => import('./tabs/NcuSessionTab.jsx'));
const NcuOverviewTab = lazy(() => import('./tabs/NcuOverviewTab.jsx'));
const NcuSolTab = lazy(() => import('./tabs/NcuSolTab.jsx'));
const NcuComputeTab = lazy(() => import('./tabs/NcuComputeTab.jsx'));
const NcuMemoryTab = lazy(() => import('./tabs/NcuMemoryTab.jsx'));
const NcuOccupancyTab = lazy(() => import('./tabs/NcuOccupancyTab.jsx'));
const NcuSchedulerTab = lazy(() => import('./tabs/NcuSchedulerTab.jsx'));
const NcuGenericTab = lazy(() => import('./tabs/NcuGenericTab.jsx'));
const NcuSourceTab = lazy(() => import('./tabs/NcuSourceTab.jsx'));

const TAB_ICONS = {
  summary:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  session:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  overview:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  sol:          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  compute:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>,
  memory:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>,
  launch:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>,
  occupancy:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  scheduler:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  warpstate:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  instructions: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
  distribution: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  source:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>,
  pmsampling:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  sourcecode:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
};

const TAB_DEFS = [
  { id: 'summary',      label: 'Summary',         always: true },
  { id: 'session',      label: 'Session',          always: true },
  { id: 'overview',     label: 'Overview',         always: true },
  { id: 'sol',          label: 'Speed of Light',   match: 'GPU Speed Of Light Throughput' },
  { id: 'compute',      label: 'Compute',          match: 'Compute Workload Analysis' },
  { id: 'memory',       label: 'Memory',           match: 'Memory Workload Analysis' },
  { id: 'launch',       label: 'Launch Stats',     match: 'Launch Statistics' },
  { id: 'occupancy',    label: 'Occupancy',        match: 'Occupancy' },
  { id: 'scheduler',    label: 'Scheduler',        match: 'Scheduler Statistics' },
  { id: 'warpstate',    label: 'Warp State',       match: 'Warp State Statistics' },
  { id: 'instructions', label: 'Instructions',     match: 'Instruction Statistics' },
  { id: 'distribution', label: 'Workload Dist.',   match: 'GPU and Memory Workload Distribution' },
  { id: 'source',       label: 'Source Counters',  match: 'Source Counters' },
  { id: 'pmsampling',   label: 'PM Sampling',      match: 'PM Sampling' },
  { id: 'sourcecode',   label: 'Source',           matchFn: k => k.source?.length > 0 },
];

const NcuKernelDetail = () => {
  const { getActiveKernel, activeTab, selectTab, files } = useNcuStore();
  const kernel = getActiveKernel();

  const availableTabs = TAB_DEFS.filter(t => {
    if (t.always) return true;
    if (t.matchFn) return kernel ? t.matchFn(kernel) : false;
    return kernel ? kernel.sections.some(s => s.name === t.match) : false;
  });

  if (files.length === 0) {
    return <div className="ncu-detail-empty"><p>No NCU file loaded.</p></div>;
  }

  return (
    <div className="ncu-detail">
      {/* Tab bar — styled like perfessor Navigation */}
      <nav className="ncu-tab-nav">
        {availableTabs.map(t => (
          <button
            key={t.id}
            className={`ncu-tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => selectTab(t.id)}
          >
            {TAB_ICONS[t.id]}
            {t.label}
          </button>
        ))}
      </nav>

      <div className="ncu-section-content">
        <Suspense fallback={<div className="ncu-loading">Loading...</div>}>
          {activeTab === 'summary'      && <NcuSummaryTab />}
          {activeTab === 'session'      && <NcuSessionTab />}
          {kernel && activeTab === 'overview'     && <NcuOverviewTab kernel={kernel} />}
          {kernel && activeTab === 'sol'          && <NcuSolTab kernel={kernel} />}
          {kernel && activeTab === 'compute'      && <NcuComputeTab kernel={kernel} />}
          {kernel && activeTab === 'memory'       && <NcuMemoryTab kernel={kernel} />}
          {kernel && activeTab === 'occupancy'    && <NcuOccupancyTab kernel={kernel} />}
          {kernel && activeTab === 'scheduler'    && <NcuSchedulerTab kernel={kernel} />}
          {kernel && activeTab === 'launch'       && <NcuGenericTab kernel={kernel} sectionName="Launch Statistics" />}
          {kernel && activeTab === 'warpstate'    && <NcuGenericTab kernel={kernel} sectionName="Warp State Statistics" />}
          {kernel && activeTab === 'instructions' && <NcuGenericTab kernel={kernel} sectionName="Instruction Statistics" />}
          {kernel && activeTab === 'distribution' && <NcuGenericTab kernel={kernel} sectionName="GPU and Memory Workload Distribution" />}
          {kernel && activeTab === 'source'       && <NcuGenericTab kernel={kernel} sectionName="Source Counters" />}
          {kernel && activeTab === 'pmsampling'   && <NcuGenericTab kernel={kernel} sectionName="PM Sampling" />}
          {kernel && activeTab === 'sourcecode'   && <NcuSourceTab kernel={kernel} />}
        </Suspense>
      </div>
    </div>
  );
};

export default NcuKernelDetail;
