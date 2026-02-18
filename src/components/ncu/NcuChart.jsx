import { useRef, useEffect } from 'react';

// Reusable Chart.js canvas wrapper for NCU charts.
// `factory` is a function (canvas) => Chart instance.
// Re-creates the chart when `factory` identity changes (use useCallback in parent).
const NcuChart = ({ factory, height = 250, style }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !factory) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    chartRef.current = factory(canvasRef.current);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [factory]);

  return (
    <div style={{ position: 'relative', height, ...style }}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default NcuChart;
