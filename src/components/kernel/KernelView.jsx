import { useMemo, useState, useRef, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import useTraceStore from '../../store/traceStore';
import Card from '../common/Card';
import { formatDuration, formatNumber } from '../../utils/formatters';
import './KernelView.css';

const KernelView = () => {
  const { kernels, selectedKernel, setSelectedKernel } = useTraceStore();
  const [sorting, setSorting] = useState([{ id: 'totalDuration', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const tableContainerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setGlobalFilter(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Kernel Name',
        cell: (info) => (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            title={info.getValue()}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {info.getValue()}
            </span>
            {info.row.original.tensorCoresUsed && (
              <span style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                padding: '0.125rem 0.375rem',
                borderRadius: '3px',
                fontSize: '0.65rem',
                fontWeight: '600',
                flexShrink: 0,
              }}>
                TC
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'calls',
        header: 'Calls',
        cell: (info) => formatNumber(info.getValue()),
        sortingFn: 'basic',
      },
      {
        accessorKey: 'totalDuration',
        header: 'Total (μs)',
        cell: (info) => formatDuration(info.getValue()),
        sortingFn: 'basic',
      },
      {
        accessorKey: 'meanDuration',
        header: 'Mean (μs)',
        cell: (info) => formatDuration(info.getValue()),
        sortingFn: 'basic',
      },
      {
        accessorKey: 'maxDuration',
        header: 'Max (μs)',
        cell: (info) => formatDuration(info.getValue()),
        sortingFn: 'basic',
      },
      {
        accessorKey: 'minDuration',
        header: 'Min (μs)',
        cell: (info) => formatDuration(info.getValue()),
        sortingFn: 'basic',
      },
      {
        accessorKey: 'meanBlocksPerSM',
        header: 'Blocks/SM',
        cell: (info) => {
          const val = info.getValue();
          return val > 0 ? val.toFixed(2) : '-';
        },
        sortingFn: 'basic',
      },
      {
        accessorKey: 'meanOccupancy',
        header: 'Occupancy (%)',
        cell: (info) => {
          const val = info.getValue();
          return val > 0 ? val.toFixed(1) : '-';
        },
        sortingFn: 'basic',
      },
    ],
    []
  );

  const data = useMemo(() => {
    if (!kernels) return [];
    return kernels;
  }, [kernels]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 45,
    overscan: 10,
  });

  const tensorCoreStats = useMemo(() => {
    if (!kernels || kernels.length === 0) return { used: 0, total: 0, percent: 0 };

    const used = kernels.filter(k => k.tensorCoresUsed).length;
    return {
      used,
      total: kernels.length,
      percent: (used / kernels.length) * 100
    };
  }, [kernels]);

  const handleExportCSV = () => {
    if (!kernels) return;

    const csvRows = [
      ['Kernel Name', 'Calls', 'Total Duration (μs)', 'Mean Duration (μs)', 'Max Duration (μs)', 'Min Duration (μs)', 'Mean Blocks Per SM', 'Mean Occupancy (%)', 'Tensor Cores Used'],
      ...kernels.map(k => [
        k.name,
        k.calls,
        k.totalDuration,
        k.meanDuration,
        k.maxDuration,
        k.minDuration,
        k.meanBlocksPerSM || 0,
        k.meanOccupancy || 0,
        k.tensorCoresUsed ? 'Yes' : 'No',
      ]),
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kernels.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!kernels || kernels.length === 0) {
    return <div className="view-container">No kernel data available</div>;
  }

  return (
    <div className="kernel-view">
      <div className="kernel-header">
        <Card title="Tensor Core Utilization">
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '1rem 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#4CAF50', marginBottom: '0.25rem' }}>
                {tensorCoreStats.percent.toFixed(1)}%
              </div>
              <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                {tensorCoreStats.used} of {tensorCoreStats.total} kernels
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="kernel-controls">
        <input
          type="text"
          placeholder="Search kernels..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="search-input"
        />
        <button onClick={handleExportCSV} className="export-button">
          Export to CSV
        </button>
        <div className="kernel-stats">
          Showing {rows.length} of {data.length} kernels
        </div>
      </div>

      <div className="table-container" ref={tableContainerRef}>
        <table className="kernel-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={header.column.getCanSort() ? 'sortable' : ''}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="header-content">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() && (
                        <span className="sort-indicator">
                          {header.column.getIsSorted() === 'asc' ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            <tr style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
              <td colSpan={columns.length} style={{ padding: 0, position: 'relative' }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  return (
                    <div
                      key={row.id}
                      className={`table-row ${
                        selectedKernel?.name === row.original.name ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedKernel(row.original)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {row.getVisibleCells().map((cell, idx) => (
                        <div
                          key={cell.id}
                          className={`table-cell ${idx === 0 ? 'cell-name' : ''}`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {selectedKernel && (
        <div className="detail-panel">
          <div className="detail-header">
            <h3>Kernel Details</h3>
            <button onClick={() => setSelectedKernel(null)} className="close-button">
              ×
            </button>
          </div>
          <table className="detail-table">
            <tbody>
              <tr>
                <td className="detail-label">Name</td>
                <td className="detail-value">{selectedKernel.name}</td>
              </tr>
              <tr>
                <td className="detail-label">Calls</td>
                <td className="detail-value">{selectedKernel.calls.toLocaleString()}</td>
              </tr>
              <tr>
                <td className="detail-label">Total Duration</td>
                <td className="detail-value">{formatDuration(selectedKernel.totalDuration)}</td>
              </tr>
              <tr>
                <td className="detail-label">Mean Duration</td>
                <td className="detail-value">{formatDuration(selectedKernel.meanDuration)}</td>
              </tr>
              <tr>
                <td className="detail-label">Min Duration</td>
                <td className="detail-value">{formatDuration(selectedKernel.minDuration)}</td>
              </tr>
              <tr>
                <td className="detail-label">Max Duration</td>
                <td className="detail-value">{formatDuration(selectedKernel.maxDuration)}</td>
              </tr>
              <tr>
                <td className="detail-label">Mean Blocks Per SM</td>
                <td className="detail-value">
                  {selectedKernel.meanBlocksPerSM > 0 ? selectedKernel.meanBlocksPerSM.toFixed(2) : '-'}
                </td>
              </tr>
              <tr>
                <td className="detail-label">Mean Occupancy</td>
                <td className="detail-value">
                  {selectedKernel.meanOccupancy > 0 ? `${selectedKernel.meanOccupancy.toFixed(1)}%` : '-'}
                </td>
              </tr>
              <tr>
                <td className="detail-label">Tensor Cores</td>
                <td className="detail-value">
                  {selectedKernel.tensorCoresUsed ? 'Yes' : 'No'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default KernelView;
