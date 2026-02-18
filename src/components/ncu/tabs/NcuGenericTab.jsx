import { NcuHelpers } from '../../../utils/ncuHelpers.js';
import { MetricsTable, SectionHints, SectionMissing } from '../NcuShared.jsx';

const NcuGenericTab = ({ kernel, sectionName }) => {
  const sec = NcuHelpers.findSection(kernel.sections, sectionName);
  if (!sec) return <SectionMissing />;

  return (
    <div>
      <h2 className="ncu-section-title">{sec.name}</h2>
      <MetricsTable section={sec} />
      <SectionHints section={sec} />
    </div>
  );
};

export default NcuGenericTab;
