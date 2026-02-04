# Professor 🧠

A comprehensive web-based visualization tool for PyTorch profiler traces, inspired by TensorBoard's profiler plugin. Built with React 19, this application provides interactive analysis of profiling data using Perfetto UI for trace visualization.

**🌐 Live Demo**: [https://kapilsharma.dev/professor/](https://kapilsharma.dev/professor/)

![React](https://img.shields.io/badge/React-19-blue)
![Vite](https://img.shields.io/badge/Vite-7.3-purple)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### 📊 Overview View
- **Summary Cards**: Total duration, event count, unique operators, GPU kernels
- **GPU Information**: Device name, memory, compute capability
- **GPU Utilization**: Visual gauge showing utilization percentage
- **Step Time Breakdown**: Pie chart categorizing time into Kernel, Memcpy, Communication, DataLoader, etc.
- **Performance Recommendations**: Automated analysis identifying bottlenecks and optimization opportunities

### ⚙️ Operators View
- **Comprehensive Table**: Device/Host durations, calls, CUDA time percentage
- **Sortable Columns**: Click headers to sort by any metric
- **Real-time Search**: Debounced filtering for smooth performance
- **Virtualized Scrolling**: Handles 1000+ operators efficiently
- **Detail Panel**: In-depth metrics for selected operators
- **CSV Export**: Download operator data for external analysis

### 🔧 Kernels View
- **GPU Kernel Analysis**: Detailed statistics for all CUDA kernels
- **Tensor Core Detection**: Identifies kernels using Tensor Cores
- **Performance Metrics**: Total/mean/min/max duration, occupancy
- **Search & Filter**: Quickly find specific kernels
- **Utilization Stats**: Overall Tensor Core usage percentage

### 📈 Trace View (Perfetto UI)
- **Interactive Timeline**: Embedded Perfetto UI for trace visualization
- **Thread & Stream Lanes**: Separate visualization for different execution contexts
- **Zoom & Pan**: Navigate through trace timeline
- **Flow Events**: Visualize async operations
- **External Viewer**: Open in new window for full Perfetto features
- **Download Option**: Export trace file

### 💾 Memory View
- **Memory Events Table**: Allocation/deallocation tracking
- **Counter Events**: Memory usage over time
- **Formatted Display**: Human-readable byte sizes and timestamps

### 🏗️ Module View
- **PyTorch Module Hierarchy**: Detected nn.Module instances
- **Module Statistics**: Occurrences, operator count per module
- **Type Information**: Module class names

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd professor

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

### Deploy to GitHub Pages

The app is configured to automatically deploy to GitHub Pages on every push to the `main` branch using GitHub Actions. The deployment workflow:

1. Builds the app to the `docs` folder
2. Uploads the build artifact
3. Deploys to GitHub Pages

To enable GitHub Pages for your repository:
1. Go to repository Settings → Pages
2. Set Source to "GitHub Actions"
3. Push to `main` branch to trigger deployment

## Usage

### 1. Generate a PyTorch Profiler Trace

```python
import torch
import torch.nn as nn
import torch.profiler as profiler

# Your model
model = nn.Sequential(
    nn.Linear(10, 100),
    nn.ReLU(),
    nn.Linear(100, 10)
).cuda()

# Input
x = torch.randn(32, 10).cuda()

# Profile with trace export
with profiler.profile(
    activities=[
        profiler.ProfilerActivity.CPU,
        profiler.ProfilerActivity.CUDA,
    ],
    record_shapes=True,
    profile_memory=True,
    with_stack=True,
) as prof:
    model(x)

# Export trace
prof.export_chrome_trace("trace.json")
```

### 2. Upload & Analyze

1. **Upload Trace**:
   - Drag and drop your `trace.json` file onto the upload zone
   - Or click "Browse Files" to select
   - Supports `.json` and `.pt.trace.json` files
   - Maximum file size: 100MB

2. **Navigate Views** (Keyboard shortcuts):
   - `1` - Overall View
   - `2` - Operators View
   - `3` - Kernels View
   - `4` - Trace View
   - `5` - Memory View
   - `6` - Modules View

3. **Analyze Performance**:
   - Check **Overall** for high-level insights and recommendations
   - Explore **Operators** to identify slow operations
   - Review **Kernels** for GPU-specific optimizations
   - Use **Trace** for timeline analysis with Perfetto
   - Inspect **Memory** for allocation patterns
   - View **Modules** for model structure analysis

## Architecture

### Technology Stack
- **React 19**: Modern UI framework
- **Vite 7.3**: Fast build tool and dev server
- **Zustand**: Lightweight state management
- **TanStack Table v8**: Powerful table with sorting/filtering
- **TanStack Virtual v3**: Virtualization for large datasets
- **Recharts 3.7**: Declarative charts for React
- **D3 Scale/Color**: Utilities for visualizations
- **Perfetto UI**: Timeline trace visualization

### Component Structure

```
src/
├── components/
│   ├── common/
│   │   ├── Card.jsx
│   │   ├── ErrorBoundary.jsx
│   │   └── LoadingSpinner.jsx
│   ├── FileUploader.jsx
│   ├── Navigation.jsx
│   ├── TraceViewer.jsx
│   ├── overview/
│   │   ├── OverviewView.jsx
│   │   ├── SummaryCards.jsx
│   │   ├── StepTimeBreakdown.jsx
│   │   ├── GPUUtilization.jsx
│   │   └── PerformanceRecommendations.jsx
│   ├── operator/
│   │   └── OperatorView.jsx
│   ├── kernel/
│   │   └── KernelView.jsx
│   ├── trace/
│   │   └── TraceView.jsx
│   ├── memory/
│   │   └── MemoryView.jsx
│   └── module/
│       └── ModuleView.jsx
├── store/
│   └── traceStore.js
├── utils/
│   ├── traceDataProcessor.js
│   ├── recommendationsEngine.js
│   ├── eventClassifier.js
│   ├── memoryTracker.js
│   ├── moduleParser.js
│   ├── colorSchemes.js
│   └── formatters.js
└── App.jsx
```

### Data Processing Pipeline

1. **File Upload & Validation**: Check file type and size
2. **JSON Parsing**: Extract trace events array
3. **Event Conversion**: Transform Begin/End pairs to Complete events
4. **Metadata Extraction**: GPU info, process/thread names
5. **Hierarchy Building**: Parent-child relationships from timestamps
6. **Self-Time Calculation**: Subtract child durations
7. **Operator Aggregation**: Group by name, compute statistics
8. **Kernel Analysis**: GPU kernel metrics, Tensor Core detection
9. **Step Time Breakdown**: Categorize events by type
10. **Recommendations Generation**: Performance insights

## Performance Recommendations Engine

The app automatically analyzes traces and provides recommendations:

### DataLoader Bottleneck
- **Detection**: DataLoader time > 10% of total
- **Suggestion**: Increase `num_workers`, enable `pin_memory=True`

### GPU Underutilization
- **Detection**: GPU utilization < 50%
- **Suggestion**: Increase batch size, use mixed precision training

### High Communication Overhead
- **Detection**: Communication > 20% (distributed training)
- **Suggestion**: Use gradient accumulation, optimize network

### Tensor Core Underutilization
- **Detection**: <50% of eligible kernels use Tensor Cores
- **Suggestion**: Use `torch.cuda.amp` for mixed precision

### Memory Inefficiency
- **Detection**: High memory fragmentation
- **Suggestion**: Use memory-efficient training techniques

## Chrome Trace Event Format

Supported event types:
- **'X' (Complete)**: Duration events with `ts` and `dur`
- **'B'/'E' (Begin/End)**: Converted to complete events
- **'i' (Instant)**: Point markers
- **'m' (Metadata)**: Process/thread names, GPU info
- **'C' (Counter)**: Memory counters
- **'s'/'t'/'f' (Async)**: Async flow events

## Performance Optimizations

- **Lazy Loading**: Views loaded on-demand with `React.lazy()`
- **Memoization**: `React.memo()` prevents unnecessary re-renders
- **Debounced Search**: 300ms debounce for smooth filtering
- **Virtualized Tables**: Only render visible rows
- **Efficient State**: Zustand for minimal re-renders

## Keyboard Shortcuts

- `1-6`: Switch between views
- `Ctrl+F`: Focus search (when available)
- `Esc`: Close detail panels

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Reference Implementation

Based on:
- [PyTorch Kineto TensorBoard Plugin](https://github.com/pytorch/kineto/tree/main/tb_plugin)
- [PyTorch Profiler Tutorial](https://docs.pytorch.org/tutorials/intermediate/tensorboard_profiler_tutorial.html)
- [Perfetto UI](https://ui.perfetto.dev/)

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License

## Acknowledgments

- Inspired by [TensorBoard Profiler](https://www.tensorflow.org/tensorboard/tensorboard_profiling_keras)
- Uses [Perfetto UI](https://ui.perfetto.dev/) for trace visualization
- Chrome Trace Event Format [spec](https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/)

---

Built for PyTorch developers to optimize deep learning performance
