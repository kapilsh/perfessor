import NcuKernelSidebar from './NcuKernelSidebar.jsx';
import NcuKernelDetail from './NcuKernelDetail.jsx';
import './NcuView.css';

const NcuView = () => {
  return (
    <div className="ncu-layout">
      <NcuKernelSidebar />
      <NcuKernelDetail />
    </div>
  );
};

export default NcuView;
