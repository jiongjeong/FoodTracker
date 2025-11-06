<template>
  <div class="card border-0 shadow-sm p-4" style="border-radius: 16px;">
    <h5 class="mb-4 fw-bold text-dark">
      <i class="bi bi-pie-chart me-2"></i>
      Waste by Category
    </h5>

    <!-- Chart Container -->
    <div class="position-relative mx-auto mb-4" style="width: 240px; height: 300px;"
      v-if="chartDataStyled.datasets[0].data.length">
      <Pie :data="chartDataStyled" :options="wasteRingOpts" :plugins="[centerTextPlugin]" />

      <div v-for="(item, i) in allLegendItems" :key="i" class="position-absolute"
        :style="getPercentageLabelPosition(i, allLegendItems)">
        <div
          class="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold shadow-lg percentage-badge"
          :style="{
            width: '56px',
            height: '56px',
            background: `linear-gradient(135deg, ${item.color} 0%, ${darkenColor(item.color, 20)} 100%)`,
            fontSize: '1.125rem',
            border: '2px solid white'
          }">
          {{ item.pct }}%
        </div>
      </div>
    </div>

    <p class="text-muted small text-center my-4" v-else>No waste data yet</p>

    <div class="d-flex flex-wrap justify-content-center gap-3 mt-3" v-if="allLegendItems.length">
      <div v-for="(item, i) in allLegendItems" :key="i" class="d-flex align-items-center gap-2">
        <span class="rounded-circle flex-shrink-0" :style="{
          width: '16px',
          height: '16px',
          backgroundColor: item.color
        }"></span>
        <span class="text-secondary small fw-medium">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Pie } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  ArcElement,
)

const props = defineProps({
  activities: {
    type: Array,
    required: true
  }
})

const WASTE_COLORS = ['#eab308', '#f43f5e', '#10b981', '#3b82f6', '#a78bfa']

const wasteRingOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#111827',
      titleColor: '#fff',
      bodyColor: '#e5e7eb',
      displayColors: false,
      padding: 10,
      callbacks: {
        label(ctx) {
          const total = ctx.dataset.data.reduce((a, b) => a + b, 0) || 0
          const val = ctx.parsed
          const pct = total ? ((val / total) * 100).toFixed(1) : 0
          return `${ctx.label}: ${val} (${pct}%)`
        }
      }
    }
  },
  animation: { duration: 700, easing: 'easeOutCubic' }
}

const centerTextPlugin = {
  id: 'centerText',
  afterDraw: (chart) => {
    const { ctx, width, height } = chart;
    ctx.restore();

    const centerX = width / 2;
    const centerY = height / 2;

    ctx.font = 'normal 1rem sans-serif';
    ctx.fillStyle = '#6c757d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Total', centerX, centerY - 20);

    const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
    ctx.font = 'bold 2.5rem sans-serif';
    ctx.fillStyle = '#2d3436';
    ctx.fillText(total, centerX, centerY + 20);

    ctx.save();
  }
};

const buildWasteByCategoryChart = (activities = [], colors = WASTE_COLORS) => {
  const counts = {}
  for (const a of activities) {
    if (a?.activityType !== 'expFood') continue
    const cat = a?.category || 'Unknown'
    counts[cat] = (counts[cat] || 0) + 1
  }
  const labels = Object.keys(counts)
  const data = labels.map(l => counts[l])
  return {
    labels,
    datasets: [{ data, backgroundColor: colors.slice(0, data.length) }]
  }
}

const styleAsRing = (basePie) => {
  const base = basePie || { labels: [], datasets: [{ data: [], backgroundColor: [] }] }
  const ds = base.datasets?.[0] || { data: [], backgroundColor: [] }
  return {
    labels: Array.isArray(base.labels) ? base.labels : [],
    datasets: [{
      data: Array.isArray(ds.data) ? ds.data : [],
      backgroundColor: Array.isArray(ds.backgroundColor) ? ds.backgroundColor : [],
      borderWidth: 0,
      borderRadius: 0,
      cutout: '72%'
    }]
  }
}

const getPercentageLabelPosition = (index, items) => {
  let cumulativePercentage = 0;
  for (let i = 0; i < index; i++) {
    cumulativePercentage += items[i].pct;
  }

  const segmentMiddle = cumulativePercentage + (items[index].pct / 2);

  const angleInDegrees = (segmentMiddle / 100) * 360 - 90;
  const angleInRadians = angleInDegrees * (Math.PI / 180);

  const radius = 140;

  const centerX = 140;
  const centerY = 140;

  const x = centerX + radius * Math.cos(angleInRadians);
  const y = centerY + radius * Math.sin(angleInRadians);

  const labelSize = 65;

  return {
    left: `${x - labelSize / 2}px`,
    top: `${y - labelSize / 2}px`,
  };
};

const createAllLegendItems = (chartData) => {
  const labels = chartData.labels || [];
  const data = chartData.datasets[0]?.data || [];
  const colors = chartData.datasets[0]?.backgroundColor || [];

  const total = data.reduce((sum, val) => sum + val, 0);

  return labels.map((label, i) => ({
    label: label,
    value: data[i],
    pct: total > 0 ? Math.round((data[i] / total) * 100) : 0,
    color: colors[i] || '#6c757d'
  })).filter(item => item.pct > 0);
};

const darkenColor = (color, percent) => {
  if (color.startsWith('#')) {
    let r = parseInt(color.slice(1, 3), 16);
    let g = parseInt(color.slice(3, 5), 16);
    let b = parseInt(color.slice(5, 7), 16);

    r = Math.floor(r * (1 - percent / 100));
    g = Math.floor(g * (1 - percent / 100));
    b = Math.floor(b * (1 - percent / 100));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  if (color.startsWith('rgb')) {
    const matches = color.match(/\d+/g);
    if (matches && matches.length >= 3) {
      let r = Math.floor(parseInt(matches[0]) * (1 - percent / 100));
      let g = Math.floor(parseInt(matches[1]) * (1 - percent / 100));
      let b = Math.floor(parseInt(matches[2]) * (1 - percent / 100));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  return color;
};

const basePie = computed(() => buildWasteByCategoryChart(props.activities, WASTE_COLORS))
const chartDataStyled = computed(() => styleAsRing(basePie.value))
const allLegendItems = computed(() => createAllLegendItems(chartDataStyled.value))
</script>

<style scoped>
.percentage-badge {
  transition: all 0.3s ease;
  cursor: pointer;
  font-size: 0.875rem;
  letter-spacing: -0.5px;
}

.percentage-badge:hover {
  transform: scale(1.15) rotate(5deg);
}
</style>
