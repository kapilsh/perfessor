import { Chart, registerables } from 'chart.js';
import { NcuHelpers } from './ncuHelpers.js';

Chart.register(...registerables);

// Chart.js visualization builders for NCU data.
// All methods accept a canvas DOM element (not an ID) so they work cleanly with React refs.

const COLORS = {
  grid: '#2a3a5e',
  tick: '#a0a0b0',
  label: '#e0e0e0',
};

export const NcuCharts = {
  speedOfLight(canvas, section) {
    const metrics = [
      { name: 'Compute (SM) Throughput', label: 'Compute (SM)' },
      { name: 'Memory Throughput', label: 'Memory' },
      { name: 'L1/TEX Cache Throughput', label: 'L1/TEX Cache' },
      { name: 'L2 Cache Throughput', label: 'L2 Cache' },
    ];

    const labels = [], values = [], colors = [];
    metrics.forEach(m => {
      const val = NcuHelpers.metricValue(section, m.name);
      if (!isNaN(val)) {
        labels.push(m.label);
        values.push(val);
        colors.push(NcuHelpers.utilizationHex(val));
      }
    });

    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colors, borderColor: colors, borderWidth: 1, borderRadius: 4, barThickness: 28 }],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ctx.parsed.x.toFixed(2) + '%' } },
        },
        scales: {
          x: { min: 0, max: 100, grid: { color: COLORS.grid }, ticks: { color: COLORS.tick, callback: v => v + '%' } },
          y: { grid: { display: false }, ticks: { color: COLORS.label, font: { size: 13 } } },
        },
      },
    });
  },

  occupancy(canvas, section) {
    const limitMetrics = ['Block Limit SM', 'Block Limit Registers', 'Block Limit Shared Mem', 'Block Limit Warps', 'Block Limit Barriers'];
    const labels = [], values = [];
    limitMetrics.forEach(name => {
      const val = NcuHelpers.metricValue(section, name);
      if (!isNaN(val)) { labels.push(name.replace('Block Limit ', '')); values.push(val); }
    });

    const theoretical = NcuHelpers.metricValue(section, 'Theoretical Occupancy');
    const achieved = NcuHelpers.metricValue(section, 'Achieved Occupancy');

    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: [...labels, 'Theoretical Occ.', 'Achieved Occ.'],
        datasets: [{
          label: 'Value',
          data: [...values, theoretical, achieved],
          backgroundColor: [...values.map(() => '#818cf8'), '#4ade80', '#60a5fa'],
          borderRadius: 4, barThickness: 28,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ctx.dataIndex >= values.length ? ctx.parsed.y.toFixed(2) + '%' : ctx.parsed.y + ' blocks' } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: COLORS.label, font: { size: 11 } } },
          y: { grid: { color: COLORS.grid }, ticks: { color: COLORS.tick } },
        },
      },
    });
  },

  schedulerDonut(canvas, section) {
    const eligible = NcuHelpers.metricValue(section, 'One or More Eligible');
    const noEligible = NcuHelpers.metricValue(section, 'No Eligible');
    if (isNaN(eligible) || isNaN(noEligible)) return null;

    return new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Eligible', 'No Eligible'],
        datasets: [{ data: [eligible, noEligible], backgroundColor: ['#4ade80', '#f87171'], borderColor: ['#4ade80', '#f87171'], borderWidth: 1 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { color: COLORS.label, padding: 16, font: { size: 13 } } },
          tooltip: { callbacks: { label: ctx => ctx.label + ': ' + ctx.parsed.toFixed(2) + '%' } },
        },
      },
    });
  },

  memoryHierarchy(canvas, section) {
    const l1Hit = NcuHelpers.metricValue(section, 'L1/TEX Hit Rate');
    const l2Hit = NcuHelpers.metricValue(section, 'L2 Hit Rate');
    if (isNaN(l1Hit) && isNaN(l2Hit)) return null;

    const l1HitRate = isNaN(l1Hit) ? 0 : l1Hit;
    const l2HitRate = isNaN(l2Hit) ? 0 : l2Hit;
    const l1Miss = 100 - l1HitRate;
    const l2Miss = l1Miss * (100 - l2HitRate) / 100;

    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['L1/TEX Cache', 'L2 Cache', 'DRAM'],
        datasets: [
          { label: 'Hit', data: [l1HitRate, l2HitRate * l1Miss / 100, 0], backgroundColor: '#4ade80', stack: 'stack' },
          { label: 'Miss (Next Level)', data: [l1Miss, l2Miss, l2Miss], backgroundColor: ['#fbbf24', '#fb923c', '#f87171'], stack: 'stack' },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: COLORS.label, padding: 12, font: { size: 11 } } },
          tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%` } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: COLORS.label, font: { size: 12 } } },
          y: { stacked: true, min: 0, max: 100, grid: { color: COLORS.grid }, ticks: { color: COLORS.tick, callback: v => v + '%' } },
        },
      },
    });
  },

  memoryBars(canvas, section) {
    const metrics = [
      { name: 'L1/TEX Hit Rate', label: 'L1 Hit Rate' },
      { name: 'L2 Hit Rate', label: 'L2 Hit Rate' },
      { name: 'Max Bandwidth', label: 'Max Bandwidth' },
      { name: 'Mem Busy', label: 'Mem Busy' },
      { name: 'Mem Pipes Busy', label: 'Mem Pipes Busy' },
    ];
    const labels = [], values = [], colors = [];
    metrics.forEach(m => {
      const val = NcuHelpers.metricValue(section, m.name);
      if (!isNaN(val)) { labels.push(m.label); values.push(val); colors.push(NcuHelpers.utilizationHex(val)); }
    });

    return new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 4, barThickness: 28 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ctx.parsed.x.toFixed(2) + '%' } },
        },
        scales: {
          x: { min: 0, max: 100, grid: { color: COLORS.grid }, ticks: { color: COLORS.tick, callback: v => v + '%' } },
          y: { grid: { display: false }, ticks: { color: COLORS.label, font: { size: 13 } } },
        },
      },
    });
  },

  horizontalBar(canvas, labels, values, { unit = '' } = {}) {
    const colors = values.map(() => '#818cf8');
    return new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 4, barThickness: 28 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ctx.parsed.x.toFixed(2) + (unit ? ' ' + unit : '') } },
        },
        scales: {
          x: { grid: { color: COLORS.grid }, ticks: { color: COLORS.tick } },
          y: { grid: { display: false }, ticks: { color: COLORS.label, font: { size: 13 } } },
        },
      },
    });
  },

  roofline(canvas, section) {
    const computeThroughput = NcuHelpers.metricValue(section, 'Compute (SM) Throughput');
    const memoryThroughput = NcuHelpers.metricValue(section, 'Memory Throughput');
    if (isNaN(computeThroughput) || isNaN(memoryThroughput)) return null;

    return new Chart(canvas, {
      type: 'scatter',
      data: {
        datasets: [
          { label: 'Kernel Performance', data: [{ x: memoryThroughput, y: computeThroughput }], backgroundColor: '#818cf8', borderColor: '#818cf8', pointRadius: 8, pointHoverRadius: 10 },
          { label: 'Compute Bound', data: [{ x: 0, y: 100 }, { x: 100, y: 100 }], borderColor: '#4ade80', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, showLine: true, fill: false },
          { label: 'Memory Bound', data: [{ x: 100, y: 0 }, { x: 100, y: 100 }], borderColor: '#f87171', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, showLine: true, fill: false },
          { label: 'Balanced', data: [{ x: 0, y: 0 }, { x: 100, y: 100 }], borderColor: '#fbbf24', borderWidth: 1, borderDash: [2, 2], pointRadius: 0, showLine: true, fill: false },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: COLORS.label, padding: 12, font: { size: 11 } } },
          tooltip: { callbacks: { label: ctx => ctx.datasetIndex === 0 ? `Compute: ${ctx.parsed.y.toFixed(1)}%, Memory: ${ctx.parsed.x.toFixed(1)}%` : ctx.dataset.label } },
        },
        scales: {
          x: { min: 0, max: 100, title: { display: true, text: 'Memory Throughput (% of Peak)', color: COLORS.tick, font: { size: 12 } }, grid: { color: COLORS.grid }, ticks: { color: COLORS.tick, callback: v => v + '%' } },
          y: { min: 0, max: 100, title: { display: true, text: 'Compute Throughput (% of Peak)', color: COLORS.tick, font: { size: 12 } }, grid: { color: COLORS.grid }, ticks: { color: COLORS.tick, callback: v => v + '%' } },
        },
      },
    });
  },
};
