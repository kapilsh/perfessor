import useNcuStore from '../../../store/ncuStore.js';

const NcuSessionTab = () => {
  const { sessionInfo, files } = useNcuStore();
  if (!sessionInfo) return <p className="ncu-error-msg">No session information available.</p>;

  const s = sessionInfo;
  const memGB = s.memoryTotal ? (s.memoryTotal / (1024 ** 3)).toFixed(2) : 'N/A';
  const l2MB = s.l2CacheSize ? (s.l2CacheSize / (1024 ** 2)).toFixed(2) : 'N/A';
  const clockGHz = s.clockRate ? (s.clockRate / 1000).toFixed(2) : 'N/A';
  const memClockGHz = s.memoryClockRate ? (s.memoryClockRate / 1000).toFixed(2) : 'N/A';
  const sharedKB = s.maxSharedMemPerBlock ? (s.maxSharedMemPerBlock / 1024).toFixed(0) + ' KB' : 'N/A';
  const totalKernels = files.reduce((sum, f) => sum + f.kernels.length, 0);

  const Row = ({ label, value }) => (
    <tr>
      <td className="ncu-session-label">{label}</td>
      <td className="ncu-session-value">{value}</td>
    </tr>
  );

  return (
    <div>
      <h2 className="ncu-section-title">Session Information</h2>

      <div className="ncu-session-section">
        <h3 className="ncu-session-section-title">Device Information</h3>
        <table className="ncu-session-table">
          <tbody>
            <Row label="Device Name" value={s.deviceName || 'Unknown'} />
            <Row label="Compute Capability" value={s.computeCapability || 'Unknown'} />
            <Row label="SM Count" value={s.smCount || 'N/A'} />
            <Row label="Total Global Memory" value={`${memGB} GB`} />
            <Row label="L2 Cache Size" value={`${l2MB} MB`} />
          </tbody>
        </table>
      </div>

      <div className="ncu-session-section">
        <h3 className="ncu-session-section-title">Clock Rates</h3>
        <table className="ncu-session-table">
          <tbody>
            <Row label="GPU Core Clock" value={`${clockGHz} GHz`} />
            <Row label="Memory Clock" value={`${memClockGHz} GHz`} />
          </tbody>
        </table>
      </div>

      <div className="ncu-session-section">
        <h3 className="ncu-session-section-title">Block Limits</h3>
        <table className="ncu-session-table">
          <tbody>
            <Row label="Max Threads per Block" value={s.maxThreadsPerBlock || 'N/A'} />
            <Row label="Max Shared Memory per Block" value={sharedKB} />
            <Row label="Max Registers per Block" value={s.maxRegistersPerBlock || 'N/A'} />
          </tbody>
        </table>
      </div>

      <div className="ncu-session-section">
        <h3 className="ncu-session-section-title">Report Information</h3>
        <table className="ncu-session-table">
          <tbody>
            <Row label="File Version" value={s.fileVersion || 'Unknown'} />
            <Row label="Total Kernels" value={totalKernels} />
            <Row label="Files Loaded" value={files.length} />
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NcuSessionTab;
