import { useState, useCallback, useRef, useEffect } from 'react';
import useTraceStore from '../store/traceStore';
import { generateRecommendations } from '../utils/recommendationsEngine';
import { readFileInChunks } from '../utils/chunkedFileReader';
import './FileUploader.css';

const FileUploader = () => {
  const [isDragging, setIsDragging] = useState(false);
  const { addTrace, setLoading, setError, setProgress } = useTraceStore();
  const workerRef = useRef(null);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const handleFile = useCallback(async (file) => {
    if (!file) return;

    if (!file.name.endsWith('.json') && !file.name.includes('.trace.json')) {
      setError('Please upload a JSON trace file (.json or .pt.trace.json)');
      return;
    }

    // Check file size (hard limit at 1GB)
    const maxSize = 1024 * 1024 * 1024; // 1GB
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    const fileSizeGB = (file.size / 1024 / 1024 / 1024).toFixed(2);
    const fileSizeLabel = file.size > maxSize ? `${fileSizeGB}GB` : `${fileSizeMB}MB`;

    if (file.size > maxSize) {
      setError(
        `File too large (${fileSizeLabel}). Maximum supported size is 1GB.\n\n` +
        `To reduce file size, profile fewer steps:\n` +
        `• Use schedule parameter: schedule(wait=1, warmup=1, active=3)\n` +
        `• Reduce profiling duration\n` +
        `• Profile only critical sections of your code`
      );
      return;
    }

    setLoading(true);
    setError(null);
    setProgress({ stage: 'reading', percent: 0, message: `Reading file (${fileSizeLabel})...` });

    try {
      // Read file in chunks with progress updates
      const text = await readFileInChunks(file, (bytesRead, totalBytes) => {
        const percent = (bytesRead / totalBytes) * 100;
        const readMB = (bytesRead / 1024 / 1024).toFixed(0);
        setProgress({
          stage: 'reading',
          percent: percent,
          message: `Reading file: ${readMB}MB / ${fileSizeLabel}`
        });
      });

      setProgress({ stage: 'parsing', percent: 10, message: 'Parsing JSON...' });

      // Create worker if not exists
      if (!workerRef.current) {
        try {
          workerRef.current = new Worker(
            new URL('../workers/traceProcessor.worker.js', import.meta.url),
            { type: 'module' }
          );
        } catch (workerError) {
          console.error('Failed to create worker:', workerError);
          throw new Error(`Failed to create worker: ${workerError.message}`);
        }
      }

      const worker = workerRef.current;

      // Set up worker message handler
      const handleWorkerMessage = (e) => {
        const { type, result, error, stage, percent, message } = e.data;

        if (type === 'progress') {
          setProgress({ stage, percent, message });
        } else if (type === 'complete') {
          // Generate recommendations
          const recommendations = generateRecommendations(result);
          result.recommendations = recommendations;

          // Parse raw data for Perfetto (needed for trace view)
          let rawData;
          try {
            rawData = JSON.parse(text);
          } catch (e) {
            rawData = text;
          }

          // Add trace to store
          addTrace({ rawData, fileName: file.name }, result);

          // Clean up
          worker.removeEventListener('message', handleWorkerMessage);
          setProgress(null);
        } else if (type === 'error') {
          console.error('Worker error:', error);
          setError(error || 'Failed to process trace file');
          worker.removeEventListener('message', handleWorkerMessage);
          setProgress(null);
        }
      };

      worker.addEventListener('message', handleWorkerMessage);

      // Add error handler
      worker.addEventListener('error', (error) => {
        console.error('Worker error:', error);
        setError(`Worker error: ${error.message}`);
        setLoading(false);
        setProgress(null);
      });

      // Send data to worker
      worker.postMessage({ type: 'process', data: text });
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err.message || 'Failed to process trace file');
      setLoading(false);
      setProgress(null);
    }
  }, [addTrace, setLoading, setError, setProgress]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleFileInput = useCallback((e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  return (
    <div className="file-uploader-container">
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        <div className="drop-zone-content">
          <svg
            className="upload-icon"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>

          <h2>Upload PyTorch Profiler Trace</h2>
          <p className="subtitle">
            Drag and drop your trace JSON file here, or click to browse
          </p>

          <input
            type="file"
            id="file-input"
            accept=".json"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />

          <label htmlFor="file-input" className="browse-button">
            Browse Files
          </label>

          <p className="file-info">
            Supports Chrome Trace Event Format (JSON)<br />
            <span style={{ fontSize: '0.85em', color: '#9ca3af' }}>
              Maximum file size: 1GB
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;
