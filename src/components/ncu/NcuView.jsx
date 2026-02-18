import NcuKernelSidebar from './NcuKernelSidebar.jsx';
import NcuKernelDetail from './NcuKernelDetail.jsx';
import './NcuView.css';

const NcuView = ({ sidebarOpen }) => {
  return (
    <div className="ncu-layout">
      {sidebarOpen && <NcuKernelSidebar />}
      <NcuKernelDetail />
    </div>
  );
};

export default NcuView;
