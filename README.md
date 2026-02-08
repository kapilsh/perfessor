<div align="center">
  <img src="public/logo-bigger.png" alt="Perfessor Logo" width="400"/>
</div>

# Perfessor

A comprehensive web-based visualization tool for PyTorch profiler traces, matching TensorBoard's profiler plugin behavior. Built with React 19, this application provides interactive analysis of profiling data with optimized performance for large trace files.

**🌐 Live Demo**: [https://kapilsharma.dev/perfessor/](https://kapilsharma.dev/perfessor/)

![React](https://img.shields.io/badge/React-19-blue)
![Vite](https://img.shields.io/badge/Vite-7.3-purple)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### 🎯 Core Capabilities
- **Multiple Trace Support**: Load and switch between multiple trace files
- **Gzip Support**: Upload compressed `.json.gz` files for smaller transfers
- **Large File Handling**: Process files up to 1GB with chunked reading and Web Workers
- **Auto Version Check**: Notifies users of new versions every 10 seconds
- **Icon-Based Navigation**: Intuitive tab icons with keyboard shortcuts (1-6)
- **Behavior Match**: Precisely matches torch-tb-profiler metrics and filtering

### 📊 Overview View
- **Summary Cards**: Total duration, event count, unique operators, GPU kernels
- **GPU Information**: Device name, memory, compute capability
- **GPU Utilization**: Visual gauge with percentage display
- **Step Time Breakdown**: Horizontal bar chart showing Kernel, CPU, Memory, DataLoader time
- **Performance Recommendations**: Automated bottleneck detection and optimization suggestions
- **Tensor Core Stats**: Overall utilization percentage

### ⚙️ Operators View
- **TensorBoard Accuracy**: Exact operator filtering matching torch-tb-profiler
- **User Annotations**: Visual badges for custom profiler annotations (NCCL, Gloo)
- **Sortable Metrics**: Device/Host self/total durations, calls, percentage breakdown
- **Real-time Search**: 300ms debounced filtering
- **Virtualized Scrolling**: Smooth performance with 1000+ operators
- **Interactive Detail Panel**: Click any row to view full operator details in table format
- **CSV Export**: Download complete operator statistics

### 🔧 Kernels View
- **Weighted Averages**: Metrics weighted by duration, matching torch-tb-profiler exactly
- **Tensor Core Detection**: "TC" badges on kernels using Tensor Cores
- **Complete Metrics**: Calls, total/mean/min/max duration, blocks per SM, occupancy
- **Compact Layout**: Optimized column widths for horizontal screen fit
- **Interactive Detail Panel**: Click any row to see detailed kernel information
- **Search & Filter**: Quick kernel lookup
- **CSV Export**: Export kernel statistics

### 📈 Trace View (Perfetto UI)
- **Embedded Perfetto**: Full timeline visualization
- **Thread & Stream Lanes**: GPU/CPU execution contexts
- **Zoom & Pan**: Detailed timeline navigation
- **Flow Events**: Async operation visualization
- **External Viewer**: Open in new window
- **Download Option**: Export trace file

### 💾 Memory View
- **Memory Events**: Allocation/deallocation tracking
- **Counter Events**: Memory usage over time
- **Formatted Display**: Human-readable sizes and timestamps

### 🏗️ Module View
- **Module Hierarchy**: Detected nn.Module instances
- **Statistics**: Occurrences and operator counts
- **Type Information**: Module class names

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd perfessor

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

**📚 For more information on PyTorch profiling**, see the [PyTorch Profiler Recipe](https://docs.pytorch.org/tutorials/recipes/recipes/profiler_recipe.html).

**⚠️ Large Files (>1GB)**: For files exceeding 1GB, consider:
- Reducing profiling duration or frequency
- Using `schedule` parameter to profile fewer steps
- Analyzing the trace on the command line with PyTorch's built-in tools
- Splitting the trace into smaller segments

### 2. Upload & Analyze

1. **Upload Trace**:
   - Drag and drop your trace file onto the upload zone
   - Or click "Browse Files" to select
   - Supports `.json`, `.pt.trace.json`, and `.gz` (gzipped) files
   - **Maximum file size: 1GB** (compressed or uncompressed)
   - Automatic decompression for gzipped files

2. **Navigate Views** (Icon-based tabs with keyboard shortcuts):
   - `1` - Overall View (dashboard icon)
   - `2` - Operators View (CPU icon)
   - `3` - Kernels View (GPU icon)
   - `4` - Trace View (timeline icon)
   - `5` - Memory View (memory chip icon)
   - `6` - Modules View (layers icon)

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

1. **File Upload & Validation**: Check file type and size, detect gzip
2. **Decompression**: Automatic gzip decompression if needed (using DecompressionStream API)
3. **Chunked Reading**: Read large files in 10MB chunks with progress tracking
4. **Web Worker Processing**: Background processing to keep UI responsive
5. **JSON Parsing**: Extract trace events array
6. **Event Conversion**: Transform Begin/End pairs to Complete events
7. **Metadata Extraction**: GPU info, process/thread names
8. **Hierarchy Building**: O(n) parent-child relationships from timestamps
9. **Self-Time Calculation**: O(n) optimized with Map-based lookups
10. **Operator Aggregation**: Exact torch-tb-profiler filtering logic
11. **Kernel Analysis**: Weighted averages, Tensor Core detection, occupancy metrics
12. **Step Time Breakdown**: Categorize events by type
13. **Recommendations Generation**: Performance insights

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

- **Web Worker Processing**: Heavy computation runs in background thread
- **Chunked File Reading**: 10MB chunks prevent browser freezing on large files
- **Gzip Support**: Smaller file transfers and automatic decompression
- **O(n) Algorithms**: Optimized hierarchy building and self-time calculation
- **Lazy Loading**: Views loaded on-demand with `React.lazy()`
- **Memoization**: `React.memo()` prevents unnecessary re-renders
- **Debounced Search**: 300ms debounce for smooth filtering
- **Virtualized Tables**: Only render visible rows (TanStack Virtual)
- **Efficient State**: Zustand for minimal re-renders
- **Optimized Grid Layout**: Responsive column sizing for better screen utilization

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
- [PyTorch Profiler Recipe](https://docs.pytorch.org/tutorials/recipes/recipes/profiler_recipe.html)
- [Perfetto UI](https://ui.perfetto.dev/)

## Contributing

Contributions welcome! 

## Acknowledgments

- Inspired by [TensorBoard Profiler](https://www.tensorflow.org/tensorboard/tensorboard_profiling_keras)
- Uses [Perfetto UI](https://ui.perfetto.dev/) for trace visualization
- Chrome Trace Event Format [spec](https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/)

