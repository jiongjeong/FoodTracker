/** ===========================
 *  Shared constants & helpers
 *  =========================== */
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export const WASTE_COLORS = ['#eab308', '#f43f5e', '#10b981', '#3b82f6', '#a78bfa']

export const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: true }, title: { display: false } },
}

export const wasteVsSavingsOpts = {
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

export const wasteRingOpts = {
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
          const total = ctx.dataset.data.reduce((a,b)=>a+b,0) || 0
          const val = ctx.parsed
          const pct = total ? ((val/total)*100).toFixed(1) : 0
          return `${ctx.label}: ${val} (${pct}%)`
        }
      }
    }
  },
  animation: { duration: 700, easing: 'easeOutCubic' }
}

export const centerTextPlugin = {
  id: 'centerText',
  afterDraw(chart) {
    const { ctx, chartArea, data } = chart
    const ds = data?.datasets?.[0]
    if (!chartArea || !ds?.data?.length) return

    const vals = ds.data
    const total = vals.reduce((a,b)=>a+b,0)
    if (!total) return
    const max = Math.max(...vals)
    const pct = Math.round((max / total) * 100)

    const x = (chartArea.left + chartArea.right) / 2
    const y = (chartArea.top + chartArea.bottom) / 2

  }
}

export const hexA = (hex, a = 1) => {
  const h = hex.replace('#','')
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16)
  return `rgba(${r},${g},${b},${a})`
}

export const toMonthIndex = (d) => {
  if (!d) return null
  const date = (d instanceof Date) ? d : new Date(d)
  if (isNaN(date)) return null
  return date.getMonth()
}

/** ===========================
 *  Pure builders (no Vue refs)
 *  =========================== */

// 1) Waste vs Savings area chart (returns {labels, datasets})
export function buildWasteVsSavingsData(activities = []) {
  const waste = Array(12).fill(0)
  const saved = Array(12).fill(0)

  for (const a of activities) {
    const m = toMonthIndex(a?.createdAt)
    if (m == null) continue
    if (a.activityType === 'expFood') {
      waste[m] += Number(a.quantity) || 1
    } else if (a.activityType === 'conFood' && a.note === 'fully consumed') {
      saved[m] += Number(a.quantity) || 1
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
        backgroundColor: 'rgba(123, 97, 255, 0.25)',
        borderColor: '#7B61FF',
        pointRadius: 0,
        borderWidth: 2
      },
      {
        label: 'Waste',
        data: waste.slice(0, end),
        tension: 0.35,
        fill: true,
        backgroundColor: 'rgba(255, 165, 0, 0.25)',
        borderColor: '#FFA449',
        pointRadius: 0,
        borderWidth: 2
      }
    ]
  }
}

// 2) Waste by Category (count records, not quantity)
export function buildWasteByCategoryChart(activities = [], colors = WASTE_COLORS) {
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

// 3) Style pie data as rounded ring (no refs)
export function styleAsRing(basePie) {
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

// 4) Build Top-3 legend rows from labels/data/colors
export function buildTop3Legend(labels = [], data = [], colors = WASTE_COLORS) {
  if (!labels.length || !data.length) return []
  const total = data.reduce((a,b)=>a+b,0) || 1
  return data
    .map((v,i) => ({ label: labels[i], pct: Math.round((v/total)*100), color: colors[i] || '#e5e7eb', v }))
    .sort((a,b)=>b.v - a.v)
    .slice(0,3)
}

// 5) Leaderboard nudge (pure string builder)
export function leaderboardNudge(activities = []) {
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
