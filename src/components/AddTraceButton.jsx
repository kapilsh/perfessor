import { useCallback, useRef, useEffect } from 'react';
import useTraceStore from '../store/traceStore';
import { generateRecommendations } from '../utils/recommendationsEngine';
import { readFileInChunks } from '../utils/chunkedFileReader';
import './AddTraceButton.css';

const AddTraceButton = () => {
  const { addTrace, setLoading, setError, setProgress } = useTraceStore();
  const fileInputRef = useRef(null);
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

    const isGzipped = file.name.endsWith('.gz');
    const isJson = file.name.endsWith('.json') || file.name.includes('.trace.json');

    if (!isJson && !isGzipped) {
      setError('Please upload a JSON trace file (.json, .pt.trace.json, or .gz)');
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
      let text;

      if (isGzipped) {
        // Decompress gzipped file
        setProgress({ stage: 'decompressing', percent: 5, message: 'Decompressing gzipped file...' });

        const arrayBuffer = await file.arrayBuffer();
        const stream = new Response(arrayBuffer).body
          .pipeThrough(new DecompressionStream('gzip'));
        const decompressedBlob = await new Response(stream).blob();

        // Read decompressed content in chunks
        text = await readFileInChunks(decompressedBlob, (bytesRead, totalBytes) => {
          const percent = (bytesRead / totalBytes) * 100;
          const readMB = (bytesRead / 1024 / 1024).toFixed(0);
          const totalMB = (totalBytes / 1024 / 1024).toFixed(0);
          setProgress({
            stage: 'reading',
            percent: percent,
            message: `Reading decompressed file: ${readMB}MB / ${totalMB}MB`
          });
        });
      } else {
        // Read file in chunks with progress updates
        text = await readFileInChunks(file, (bytesRead, totalBytes) => {
          const percent = (bytesRead / totalBytes) * 100;
          const readMB = (bytesRead / 1024 / 1024).toFixed(0);
          setProgress({
            stage: 'reading',
            percent: percent,
            message: `Reading file: ${readMB}MB / ${fileSizeLabel}`
          });
        });
      }

      setProgress({ stage: 'parsing', percent: 10, message: 'Parsing JSON...' });

      // Create worker if not exists
      if (!workerRef.current) {
        workerRef.current = new Worker(
          new URL('../workers/traceProcessor.worker.js', import.meta.url),
          { type: 'module' }
        );
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

  const handleFileInput = useCallback((e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFile]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="add-trace-button-container">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.gz"
        onChange={handleFileInput}
        style={{ display: 'none' }}
      />
      <button className="add-trace-button" onClick={handleClick}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Trace
      </button>
    </div>
  );
};

export default AddTraceButton;
