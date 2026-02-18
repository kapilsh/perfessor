import { useRef, useEffect, useState } from 'react';
import useTraceStore from '../../store/traceStore';
import Card from '../common/Card';
import './TraceView.css';

const TraceView = () => {
  const { rawTraceData, fileName } = useTraceStore();
  const iframeRef = useRef(null);
  const [loadingStatus, setLoadingStatus] = useState('Loading Perfetto...');

  const openPerfettoInNewWindow = () => {
    if (!rawTraceData) return;

    const win = window.open('https://ui.perfetto.dev');
    if (!win) {
      alert('Please allow popups to open Perfetto in a new window');
      return;
    }

    let pingInterval = setInterval(() => {
      win.postMessage('PING', 'https://ui.perfetto.dev');
    }, 50);

    const messageHandler = (event) => {
      if (event.source !== win) return;

      if (event.data === 'PONG') {
        clearInterval(pingInterval);
        window.removeEventListener('message', messageHandler);

        try {
          const traceJson = typeof rawTraceData === 'string'
            ? rawTraceData
            : JSON.stringify(rawTraceData);

          const traceBuffer = new TextEncoder().encode(traceJson).buffer;

          win.postMessage({
            perfetto: {
              buffer: traceBuffer,
              title: fileName || 'PyTorch Trace',
              fileName: fileName || 'trace.json',
            }
          }, 'https://ui.perfetto.dev');
        } catch (err) {
          console.error('Error sending trace:', err);
        }
      }
    };

    window.addEventListener('message', messageHandler);

    setTimeout(() => {
      clearInterval(pingInterval);
      window.removeEventListener('message', messageHandler);
    }, 10000);
  };

  const downloadTrace = () => {
    if (!rawTraceData) return;

    const traceData = typeof rawTraceData === 'string'
      ? rawTraceData
      : JSON.stringify(rawTraceData, null, 2);

    const blob = new Blob([traceData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'trace.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!rawTraceData || !iframeRef.current) return;

    const iframe = iframeRef.current;
    let messageListener = null;
    let pingInterval = null;
    let pongReceived = false;

    messageListener = (event) => {
      if (event.source !== iframe.contentWindow) return;

      if (event.data === 'PONG') {
        pongReceived = true;

        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
        }

        setLoadingStatus('');

        try {
          const traceJson = typeof rawTraceData === 'string'
            ? rawTraceData
            : JSON.stringify(rawTraceData);

          const encoder = new TextEncoder();
          const uint8Array = encoder.encode(traceJson);

          iframe.contentWindow.postMessage(
            {
              perfetto: {
                buffer: uint8Array.buffer,
                title: fileName || 'PyTorch Trace',
                fileName: fileName || 'trace.json',
              }
            },
            'https://ui.perfetto.dev',
            [uint8Array.buffer]
          );
        } catch (err) {
          console.error('Error sending trace:', err);
          setLoadingStatus('Error loading trace');
        }
      }
    };

    window.addEventListener('message', messageListener);

    const startPinging = () => {
      let attempts = 0;

      pingInterval = setInterval(() => {
        if (pongReceived) {
          clearInterval(pingInterval);
          return;
        }

        attempts++;

        if (attempts > 100) {
          clearInterval(pingInterval);
          setLoadingStatus('Connection timeout - try "Open in New Window"');
          return;
        }

        try {
          iframe.contentWindow.postMessage('PING', 'https://ui.perfetto.dev');
        } catch (err) {
          console.error('Error sending PING:', err);
        }
      }, 100);
    };

    const handleIframeLoad = () => {
      setTimeout(() => {
        startPinging();
      }, 1000);
    };

    iframe.addEventListener('load', handleIframeLoad);

    return () => {
      if (messageListener) {
        window.removeEventListener('message', messageListener);
      }
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      iframe.removeEventListener('load', handleIframeLoad);
    };
  }, [rawTraceData, fileName]);

  if (!rawTraceData) {
    return <div className="view-container">No trace data available</div>;
  }

  return (
    <div className="trace-view">
      <Card>
        <div className="trace-controls">
          <h3>Trace Timeline Visualization</h3>
          <div className="button-group">
            <button onClick={openPerfettoInNewWindow} className="control-button primary">
              Open in New Window
            </button>
            <button onClick={downloadTrace} className="control-button">
              Download Trace
            </button>
          </div>
        </div>

        {loadingStatus && (
          <div className="trace-info">
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>{loadingStatus}</p>
          </div>
        )}
      </Card>

      <div className="perfetto-container">
        <iframe
          ref={iframeRef}
          src="https://ui.perfetto.dev"
          className="perfetto-iframe"
          title="Perfetto Trace Viewer"
          allow="clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
        />
      </div>
    </div>
  );
};

export default TraceView;
