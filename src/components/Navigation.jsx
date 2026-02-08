import { useEffect } from 'react';
import useTraceStore from '../store/traceStore';
import './Navigation.css';

const Navigation = () => {
  const { currentView, setView } = useTraceStore();

  const tabs = [
    {
      id: 'overview',
      label: 'Overall',
      key: '1',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      )
    },
    {
      id: 'operators',
      label: 'Operators',
      key: '2',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <path d="M9 1v6M15 1v6M9 17v6M15 17v6M1 9h6M17 9h6M1 15h6M17 15h6" />
        </svg>
      )
    },
    {
      id: 'kernels',
      label: 'Kernels',
      key: '3',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M6 12h4M10 10v4M14 12h4" />
        </svg>
      )
    },
    {
      id: 'trace',
      label: 'Trace',
      key: '4',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" />
          <circle cx="8" cy="12" r="2" fill="currentColor" />
          <circle cx="16" cy="6" r="2" fill="currentColor" />
          <circle cx="12" cy="18" r="2" fill="currentColor" />
        </svg>
      )
    },
    {
      id: 'memory',
      label: 'Memory',
      key: '5',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="7" width="18" height="12" rx="2" />
          <path d="M3 11h18M7 7V4M12 7V4M17 7V4M7 19v3M12 19v3M17 19v3" />
        </svg>
      )
    },
    {
      id: 'modules',
      label: 'Modules',
      key: '6',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7h16M4 12h16M4 17h16" />
          <rect x="2" y="5" width="20" height="14" rx="2" />
        </svg>
      )
    },
  ];

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      const tab = tabs.find(t => t.key === e.key);
      if (tab) {
        setView(tab.id);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [setView]);

  return (
    <nav className="navigation">
      <div className="nav-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`nav-tab ${currentView === tab.id ? 'active' : ''}`}
            onClick={() => setView(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
