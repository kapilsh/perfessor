const NcuSourceTab = ({ kernel }) => {
  if (!kernel.source?.length) {
    return <p className="ncu-error-msg">No source information available for this kernel.</p>;
  }

  let lastFile = '';
  let lastLine = 0;

  return (
    <div>
      <h2 className="ncu-section-title">Source Code</h2>
      <div className="ncu-source-container">
        <table className="ncu-source-table">
          <thead>
            <tr>
              <th className="ncu-col-address">Address</th>
              <th className="ncu-col-sass">SASS</th>
              <th className="ncu-col-ptx">PTX</th>
              <th className="ncu-col-source">Source</th>
            </tr>
          </thead>
          <tbody>
            {kernel.source.map((line, i) => {
              let fileDisplay = null;
              if (line.file && (line.file !== lastFile || line.line !== lastLine)) {
                const shortFile = line.file.split('/').pop();
                fileDisplay = (
                  <span className="ncu-source-loc" title={line.file}>
                    {shortFile}:{line.line}
                  </span>
                );
                lastFile = line.file;
                lastLine = line.line;
              }
              return (
                <tr key={i}>
                  <td className="ncu-col-address">{line.address}</td>
                  <td className="ncu-col-sass"><pre>{line.sass}</pre></td>
                  <td className="ncu-col-ptx"><pre>{line.ptx}</pre></td>
                  <td className="ncu-col-source">{fileDisplay}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NcuSourceTab;
