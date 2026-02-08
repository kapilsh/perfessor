import { useMemo, useState, useRef, useEffect, memo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import useTraceStore from '../../store/traceStore';
import { formatDuration } from '../../utils/formatters';

const OperatorView = () => {
  const { operators, selectedOperator, setSelectedOperator } = useTraceStore();
  const [sorting, setSorting] = useState([{ id: 'deviceSelfDuration', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const tableContainerRef = useRef(null);

  // Debounce search input
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
        header: 'Operation Name',
        cell: (info) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }} title={info.getValue()}>
              {info.getValue()}
            </span>
            {info.row.original.isUserAnnotation && (
              <span style={{
                backgroundColor: '#2196F3',
                color: 'white',
                padding: '0.125rem 0.375rem',
                borderRadius: '3px',
                fontSize: '0.65rem',
                fontWeight: '600',
                flexShrink: 0,
              }}>
                USER
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'calls',
        header: 'Calls',
        cell: (info) => info.getValue().toLocaleString(),
        sortingFn: 'basic',
      },
      {
        accessorKey: 'deviceSelfDuration',
        header: 'CUDA Self',
        cell: (info) => formatDuration(info.getValue()),
        sortingFn: 'basic',
      },
      {
        accessorKey: 'deviceTotalDuration',
        header: 'CUDA Total',
        cell: (info) => formatDuration(info.getValue()),
        sortingFn: 'basic',
      },
      {
        accessorKey: 'hostSelfDuration',
        header: 'CPU Self',
        cell: (info) => formatDuration(info.getValue()),
        sortingFn: 'basic',
      },
      {
        accessorKey: 'hostTotalDuration',
        header: 'CPU Total',
        cell: (info) => formatDuration(info.getValue()),
        sortingFn: 'basic',
      },
      {
        accessorKey: 'selfCudaTimePercent',
        header: '% CUDA Time',
        cell: (info) => `${info.getValue().toFixed(1)}%`,
        sortingFn: 'basic',
      },
      {
        accessorKey: 'selfCpuTimePercent',
        header: '% CPU Time',
        cell: (info) => `${info.getValue().toFixed(1)}%`,
        sortingFn: 'basic',
      },
    ],
    []
  );

  const data = useMemo(() => {
    if (!operators) return [];
    return operators;
  }, [operators]);

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

  const handleExportCSV = () => {
    if (!operators) return;

    const csvRows = [
      ['Operation Name', 'Calls', 'CUDA Self (μs)', 'CUDA Total (μs)', 'CPU Self (μs)', 'CPU Total (μs)', '% CUDA Time', '% CPU Time'],
      ...operators.map(op => [
        op.name,
        op.calls,
        op.deviceSelfDuration,
        op.deviceTotalDuration,
        op.hostSelfDuration,
        op.hostTotalDuration,
        op.selfCudaTimePercent,
        op.selfCpuTimePercent,
      ]),
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'operators.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!operators || operators.length === 0) {
    return <div className="view-container">No operator data available</div>;
  }

  return (
    <div className="view-container operator-view">
      <div className="operator-header">
        <div className="operator-controls">
          <input
            type="text"
            placeholder="Search operations..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="search-input"
          />
          <button onClick={handleExportCSV} className="export-button">
            Export to CSV
          </button>
        </div>
        <div className="operator-stats">
          Showing {rows.length} of {data.length} operations
        </div>
      </div>

      <div className="table-container" ref={tableContainerRef}>
        <table className="operator-table">
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
                        selectedOperator?.name === row.original.name ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedOperator(row.original)}
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

      {selectedOperator && (
        <div className="detail-panel">
          <div className="detail-header">
            <h3>Operator Details</h3>
            <button onClick={() => setSelectedOperator(null)} className="close-button">
              ×
            </button>
          </div>
          <table className="detail-table">
            <tbody>
              <tr>
                <td className="detail-label">Name</td>
                <td className="detail-value">{selectedOperator.name}</td>
              </tr>
              <tr>
                <td className="detail-label">Category</td>
                <td className="detail-value">{selectedOperator.category}</td>
              </tr>
              <tr>
                <td className="detail-label">Calls</td>
                <td className="detail-value">{selectedOperator.calls.toLocaleString()}</td>
              </tr>
              <tr>
                <td className="detail-label">CUDA Self Duration</td>
                <td className="detail-value">{formatDuration(selectedOperator.deviceSelfDuration)}</td>
              </tr>
              <tr>
                <td className="detail-label">CUDA Total Duration</td>
                <td className="detail-value">{formatDuration(selectedOperator.deviceTotalDuration)}</td>
              </tr>
              <tr>
                <td className="detail-label">CPU Self Duration</td>
                <td className="detail-value">{formatDuration(selectedOperator.hostSelfDuration)}</td>
              </tr>
              <tr>
                <td className="detail-label">CPU Total Duration</td>
                <td className="detail-value">{formatDuration(selectedOperator.hostTotalDuration)}</td>
              </tr>
              <tr>
                <td className="detail-label">Min Duration</td>
                <td className="detail-value">{formatDuration(selectedOperator.minDuration)}</td>
              </tr>
              <tr>
                <td className="detail-label">Max Duration</td>
                <td className="detail-value">{formatDuration(selectedOperator.maxDuration)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .operator-view {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 120px);
        }

        .operator-header {
          padding: 1.5rem;
          background: #1f2937;
          border-bottom: 1px solid #374151;
        }

        .operator-controls {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .search-input {
          flex: 1;
          padding: 0.5rem 1rem;
          background: #374151;
          border: 1px solid #4b5563;
          border-radius: 6px;
          color: #f3f4f6;
          font-size: 0.875rem;
        }

        .search-input:focus {
          outline: none;
          border-color: #6366f1;
        }

        .export-button {
          padding: 0.5rem 1.5rem;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: background 0.2s;
        }

        .export-button:hover {
          background: #4f46e5;
        }

        .operator-stats {
          font-size: 0.875rem;
          color: #9ca3af;
        }

        .table-container {
          flex: 1;
          overflow: auto;
          background: #111827;
        }

        .operator-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        .operator-table thead {
          position: sticky;
          top: 0;
          z-index: 10;
          background: #1f2937;
        }

        .operator-table thead tr {
          display: grid;
          grid-template-columns: minmax(200px, 2fr) 100px repeat(4, minmax(120px, 1fr)) repeat(2, 110px);
          gap: 0;
        }

        .operator-table th {
          padding: 0.75rem 1rem;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #9ca3af;
          border-bottom: 1px solid #374151;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .operator-table th.sortable {
          cursor: pointer;
          user-select: none;
        }

        .operator-table th.sortable:hover {
          background: #374151;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sort-indicator {
          color: #6366f1;
        }

        .table-row {
          display: grid;
          grid-template-columns: minmax(200px, 2fr) 100px repeat(4, minmax(120px, 1fr)) repeat(2, 110px);
          gap: 0;
          border-bottom: 1px solid #374151;
          cursor: pointer;
          transition: background 0.15s;
        }

        .table-row:hover {
          background: #1f2937;
        }

        .table-row.selected {
          background: #4338ca;
        }

        .table-cell {
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          color: #f3f4f6;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .detail-panel {
          background: #1f2937;
          border-top: 1px solid #374151;
          padding: 1.5rem;
        }

        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .detail-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #f3f4f6;
        }

        .close-button {
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0;
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }

        .close-button:hover {
          background: #374151;
          color: #f3f4f6;
        }

        .detail-table {
          width: 100%;
          border-collapse: collapse;
        }

        .detail-table tbody tr {
          border-bottom: 1px solid #374151;
        }

        .detail-table tbody tr:last-child {
          border-bottom: none;
        }

        .detail-table td {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
        }

        .detail-table .detail-label {
          color: #9ca3af;
          font-weight: 500;
          white-space: nowrap;
          width: 180px;
        }

        .detail-table .detail-value {
          color: #f3f4f6;
          font-family: monospace;
          word-break: break-all;
        }
      `}</style>
    </div>
  );
};

export default OperatorView;
