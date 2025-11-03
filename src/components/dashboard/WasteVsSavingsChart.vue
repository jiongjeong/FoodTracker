<template>
  <div class="glass-card p-4 charts-left-card h-100 d-flex flex-column">
    <div class="row g-0">
      <!-- Left panel -->
      <div class="col-md-4">
        <LeaderboardInsightCard :message="leaderboardMessage" />
      </div>

      <!-- Right panel -->
      <div class="col-md-8 p-3 p-md-4">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h5 class="mb-0 fw-bold">
            <i class="bi bi-activity me-2"></i>
            Waste vs Savings
          </h5>
          <div class="d-flex align-items-center small fw-semibold">
            <span class="me-3 d-inline-flex align-items-center">
              <span class="me-2" style="width:10px; height:10px; border-radius:50%; background: #FFA449"></span>
              Savings
            </span>
            <span class="d-inline-flex align-items-center">
              <span class="me-2" style="width:10px; height:10px; border-radius:50%; background: #7B61FF;"></span>
              Waste
            </span>
          </div>
        </div>
        <div style="height:220px">
          <Line :data="wasteVsSavingsData" :options="wasteVsSavingsOpts" />
        </div>
      </div>
    </div>

    <!-- Bottom KPI row -->
    <AnalyticsKPIRow :analytics="analytics" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from 'chart.js'
import LeaderboardInsightCard from './LeaderboardInsightCard.vue'
import AnalyticsKPIRow from './AnalyticsKPIRow.vue'

// Register Chart.js components
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
)

const props = defineProps({
  activities: {
    type: Array,
    required: true
  },
  analytics: {
    type: Object,
    required: true
  }
})

// Chart configuration
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const wasteVsSavingsOpts = {
  maintainAspectRatio: false,
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#111827',
      titleColor: '#fff',
      bodyColor: '#e5e7eb',
      displayColors: false,
      padding: 10,
      callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}` }
    }
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9CA3AF', font: { weight: 600 } } },
    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.06)', drawBorder: false }, ticks: { color: '#A3A3B0', precision: 0 } }
  },
  layout: { padding: { top: 6, right: 6, left: 6, bottom: 0 } },
  animation: { duration: 600, easing: 'easeOutCubic' }
}

const toMonthIndex = (d) => {
  if (!d) return null
  const date = (d instanceof Date) ? d : new Date(d)
  if (isNaN(date)) return null
  return date.getMonth()
}

const buildWasteVsSavingsData = (activities = []) => {
  const waste = Array(12).fill(0)
  const saved = Array(12).fill(0)

  for (const a of activities) {
    const m = toMonthIndex(a?.createdAt)
    if (m == null) continue
    if (a.activityType === 'expFood') {
      waste[m] += 1 
    } else if ((a.activityType === 'conFood' && a.note === 'fully consumed') ||
      (a.activityType === 'donFood')) {
      saved[m] += 1 
    }
  }
  const lastIdx = Math.max(
    waste.findLastIndex(v => v>0),
    saved.findLastIndex(v => v>0)
  )
  const end = lastIdx >= 0 ? lastIdx + 1 : 12
  const labels = MONTHS.slice(0, end)

  return {
    labels,
    datasets: [
      {
        label: 'Savings',
        data: saved.slice(0, end),
        tension: 0.35,
        fill: true,
        backgroundColor: 'rgba(255, 165, 0, 0.25)',
        borderColor: '#FFA449',
        pointRadius: 0,
        borderWidth: 2
      },
      {
        label: 'Waste',
        data: waste.slice(0, end),
        tension: 0.35,
        fill: true,
        backgroundColor: 'rgba(123, 97, 255, 0.25)',
        borderColor: '#7B61FF',
        pointRadius: 0,
        borderWidth: 2
      }
    ]
  }
}

const leaderboardNudge = (activities = []) => {
  const wasteCount = activities.filter(a => a.activityType === 'expFood').length
  const saveCount  = activities.filter(a => a.activityType === 'conFood').length
  const total = wasteCount + saveCount
  const ratio = `${wasteCount}:${saveCount}`
  const pctWasted = total > 0 ? Math.round((wasteCount / total) * 100) : 0

  const wasteByCat = {}
  for (const a of activities) {
    if (a.activityType === 'expFood') {
      const cat = a.category || 'Unknown'
      wasteByCat[cat] = (wasteByCat[cat] || 0) + 1
    }
  }
  const topCats = Object.entries(wasteByCat).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([cat]) => cat)
  const tail = topCats.length
    ? ` Try cutting down on ${topCats.join(', ')} to climb the leaderboard.`
    : ` Keep reducing waste to boost your Food Score.`
  return `Your current waste-to-save ratio is ${ratio} (${pctWasted}% wasted).${tail}`
}

const wasteVsSavingsData = computed(() => buildWasteVsSavingsData(props.activities))
const leaderboardMessage = computed(() => leaderboardNudge(props.activities))
</script>
