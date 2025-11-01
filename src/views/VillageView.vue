<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { db, auth } from '@/firebase'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import LeaderboardSidebar from '@/components/LeaderboardSidebar.vue'
import VillageHeader from '@/components/VillageHeader.vue'

/* ---------- REFS ---------- */
const panContainer = ref(null)
const villageImg = ref(null)
const allMonkeys = ref([])
const hoveredMonkey = ref(null)

/* ---------- PAN ---------- */
const isPanning = ref(false)
const startX = ref(0)
const startY = ref(0)
const translateX = ref(0)
const translateY = ref(0)

/* ---------- ZOOM ---------- */
const zoom = ref(1.0)
const minZoom = 1
const maxZoom = 5.0
const zoomStep = 0.3

/* ---------- WALKING ---------- */
const LAND_BOUNDS = { minX: 30, maxX: 70, minY: 20, maxY: 75 }
let animationFrame = null

/* ---------- MOUNT ---------- */
onMounted(() => {
  const uid = auth.currentUser.uid
  const q = query(collection(db, 'user'), orderBy('foodScore', 'desc'), limit(5))

  onSnapshot(q, snap => {
    allMonkeys.value = snap.docs.map(d => {
      const data = d.data()
      const fallback = getRandomLandPosition()
      const pos = data.village || fallback

      return {
        uid: d.id,
        name: data.name || 'Anon',
        monkeyId: data.monkey?.selected || 'monkey1',
        score: data.foodScore || 0,
        pos: { x: pos.x, y: pos.y },
        target: { ...pos },
        speed: 0.02 + Math.random() * 0.03,
        isYou: d.id === uid
      }
    })

    if (!animationFrame) startWalking()
  })
})

onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
})

/* ---------- LAND CLAMPING (natural size) ---------- */
const percentToPx = (percent, axis) => {
  const img = villageImg.value
  if (!img) return 0
  const size = axis === 'x' ? img.naturalWidth : img.naturalHeight
  return (percent / 100) * size
}

const clampToLand = (x, y) => {
  const imgW = villageImg.value?.naturalWidth || 100
  const imgH = villageImg.value?.naturalHeight || 100

  const minXPx = percentToPx(LAND_BOUNDS.minX, 'x')
  const maxXPx = percentToPx(LAND_BOUNDS.maxX, 'x')
  const minYPx = percentToPx(LAND_BOUNDS.minY, 'y')
  const maxYPx = percentToPx(LAND_BOUNDS.maxY, 'y')

  const xPx = (x / 100) * imgW
  const yPx = (y / 100) * imgH

  const clampedXPx = Math.max(minXPx, Math.min(maxXPx, xPx))
  const clampedYPx = Math.max(minYPx, Math.min(maxYPx, yPx))

  return {
    x: (clampedXPx / imgW) * 100,
    y: (clampedYPx / imgH) * 100
  }
}

const getRandomLandPosition = () => {
  const raw = {
    x: Math.random() * (LAND_BOUNDS.maxX - LAND_BOUNDS.minX) + LAND_BOUNDS.minX,
    y: Math.random() * (LAND_BOUNDS.maxY - LAND_BOUNDS.minY) + LAND_BOUNDS.minY
  }
  return clampToLand(raw.x, raw.y)
}

/* ---------- WALKING LOOP ---------- */
const startWalking = () => {
  const walk = () => {
    allMonkeys.value.forEach(m => {
      if (
        Math.abs(m.pos.x - m.target.x) < 0.5 &&
        Math.abs(m.pos.y - m.target.y) < 0.5
      ) {
        m.target = getRandomLandPosition()
      }

      const dx = m.target.x - m.pos.x
      const dy = m.target.y - m.pos.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 0) {
        m.pos.x += (dx / dist) * m.speed
        m.pos.y += (dy / dist) * m.speed
      }

      const clamped = clampToLand(m.pos.x, m.pos.y)
      m.pos.x = clamped.x
      m.pos.y = clamped.y
    })

    animationFrame = requestAnimationFrame(walk)
  }
  walk()
}

/* ---------- PANNING ---------- */
const startPan = e => {
  // don't start panning when the pointer started inside a monkey element
  // handle both mouse and touch events
  const target = (e.touches && e.touches[0] && document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY)) || e.target
  if (target && target.closest && target.closest('.monkey')) return

  if (e.button && e.button !== 0) return
  isPanning.value = true
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  startX.value = clientX - translateX.value
  startY.value = clientY - translateY.value
  if (panContainer.value) panContainer.value.style.cursor = 'grabbing'
}

const onPan = e => {
  if (!isPanning.value) return
  e.preventDefault()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  translateX.value = clientX - startX.value
  translateY.value = clientY - startY.value
}
const endPan = () => {
  isPanning.value = false
  if (panContainer.value) panContainer.value.style.cursor = 'grab'
}

/* ---------- ZOOMING ---------- */
const onWheel = (event) => {
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault()
    const delta = Math.sign(event.deltaY)
    zoomLevel.value = Math.max(50, Math.min(200, zoomLevel.value - delta * 5))
  }
}
const zoomIn = () => {
  if (!panContainer.value) return
  const r = panContainer.value.getBoundingClientRect()
  zoomAtPoint(zoomStep, r.left + r.width / 2, r.top + r.height / 2)
}
const zoomOut = () => {
  if (!panContainer.value) return
  const r = panContainer.value.getBoundingClientRect()
  zoomAtPoint(-zoomStep, r.left + r.width / 2, r.top + r.height / 2)
}
const zoomAtPoint = (delta, clientX, clientY) => {
  if (!panContainer.value) return
  const rect = panContainer.value.getBoundingClientRect()
  const old = zoom.value
  const neu = Math.max(minZoom, Math.min(maxZoom, old + delta))
  if (neu === old) return

  const offsetX = clientX - rect.left
  const offsetY = clientY - rect.top
  const ratio = neu / old

  translateX.value = clientX - (offsetX + translateX.value) * ratio
  translateY.value = clientY - (offsetY + translateY.value) * ratio
  zoom.value = neu
}

/* ---------- STYLE ---------- */
const panStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${zoom.value})`,
  transformOrigin: 'top left',
  cursor: isPanning.value ? 'grabbing' : 'grab'
}))

const monkeyStyle = m => ({
  position: 'absolute',
  left: `${m.pos.x}%`,
  top: `${m.pos.y}%`,
  transform: 'translate(-50%, -50%)',
  width: '64px',
  height: '64px',
  zIndex: m.isYou ? 100 : 50,
  pointerEvents: 'auto',
  transition: m.isYou ? 'none' : 'left 0.1s linear, top 0.1s linear'
})

// on hover, change to banana monkey
const monkeySrc = (monkey) => {
  const isHovered = hoveredMonkey.value === monkey.uid
  const normal = `/monkey/${monkey.monkeyId}.png`
  const banana = `/bananagif.gif`  // ← SAME IMAGE FOR ALL
  return isHovered ? banana : normal
}

const onMonkeyClick = m => alert(`${m.name} – ${m.monkeyId}`)
const zoomLevel = computed(() => Math.round(zoom.value * 100))
const onHover = (uid) => { hoveredMonkey.value = uid }
const onHoverLeave = () => { hoveredMonkey.value = null }
</script>

<template>
    <VillageHeader />

    <div
      class="village-page"
      @wheel="onWheel"
    >
    <div
      ref="panContainer"
      class="pan-container"
      :style="panStyle"
      @mousedown="startPan"
      @mousemove="onPan"
      @mouseup="endPan"
      @mouseleave="endPan"
      @touchstart="startPan"
      @touchmove="onPan"
      @touchend="endPan"
    >

        <img
          ref="villageImg"
          src="/monkeyvillage.png"
          class="village-bg"
          alt="Monkey Village"
        />

        <!-- Monkeys -->
        <div
          v-for="monkey in allMonkeys"
          :key="monkey.uid"
          class="monkey"
          :class="{ you: monkey.isYou, hover: hoveredMonkey === monkey.uid }"
          :style="monkeyStyle(monkey)"
        >
        <img
          :src="monkeySrc(monkey)"
          class="monkey-img"
          @mouseenter="onHover(monkey.uid)"
          @mouseleave="onHoverLeave"
          @click.stop="onMonkeyClick(monkey)"
          alt=""
        />

          <!-- POPUP -->
          <div v-if="hoveredMonkey === monkey.uid" class="popup">
            <div class="popup-name">{{ monkey.name }}</div>
            <div class="popup-score">Score: {{ monkey.score }}</div>
          </div>

          <!-- Labels -->
          <div v-if="monkey.isYou" class="you-label">You</div>
          <div v-else class="name-label">{{ monkey.name }}</div>
        </div>
      </div>

      <!-- Zoom controls -->
      <div class="zoom-controls">
        <button @click="zoomIn" class="zoom-btn">+</button>
        <button @click="zoomOut" class="zoom-btn">-</button>
        <div class="zoom-level">{{ zoomLevel }}%</div>
      </div>

      <LeaderboardSidebar />
    </div>
</template>

<style scoped>
/* Full-screen village section */
.village-page {
  width: 100%;
  /* height: 100vh; */
  position: relative;
  overflow: hidden;
  background: transparent;
  user-select: none;
  cursor: grab;
}

/* Pan container */
.pan-container {
  position: relative;
  width: 100vw;
  /* height: 100vh; */
}

.village-bg {
  width: 100vw;
  height: 100vh;
  object-fit: cover;
  object-position: center;
  display: block;
  image-rendering: pixelated;
  pointer-events: none;
}

/* ---------- MONKEYS ---------- */
.monkey {
  position: absolute;
  width: 64px;
  height: 64px;
  text-align: center;
}
.monkey-img {
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  border: 3px solid #000;
  border-radius: 50%;
  box-shadow: 0 4px 8px rgba(0,0,0,.4);
}
.monkey-img:hover {
  filter: brightness(1.4) hue-rotate(60deg) drop-shadow(0 0 12px #FFD700);
  border-color: #FFD700;
  transform: scale(1.15);
  transition: all 0.2s ease;
}

.monkey.you .monkey-img {
  border-color: #FFD700;
  box-shadow: 0 0 16px #FFD700;
}

.monkey, .monkey-img {
  pointer-events: auto;
}

.popup, .you-label, .name-label {
  pointer-events: none;
}

/* ---------- LABELS & POPUP ---------- */
.you-label,
.name-label,
.popup {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  pointer-events: none;
  font-family: monospace;
}
.you-label {
  top: -50px;
  background: #000;
  color: #FFD700;
  padding: 6px 12px;
  border-radius: 16px;
  font: bold 14px monospace;
  z-index: 200;
}
.name-label {
  bottom: -24px;
  background: rgba(0,0,0,.7);
  color: #fff;
  padding: 2px 8px;
  border-radius: 8px;
  font: 10px monospace;
}
.popup {
  bottom: 100%;
  background: #000;
  color: #fff;
  padding: 6px 10px;
  border-radius: 10px;
  margin-bottom: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,.5);
  opacity: 0;
  animation: popupFade .2s ease forwards;
  z-index: 300;
}
.popup-name { color:#FFD700; font-size:13px; font-weight:bold; }
.popup-score { color:#aaa; font-size:11px; margin-top:1px; }
@keyframes popupFade {
  from { opacity:0; transform:translateX(-50%) translateY(8px); }
  to   { opacity:1; transform:translateX(-50%) translateY(0); }
}

/* ---------- ZOOM CONTROLS ---------- */
.zoom-controls {
  position: fixed;
  bottom: 16px;
  right: 16px;
  display: flex;
  gap: 6px;
  background: rgba(0,0,0,.8);
  padding: 8px 12px;
  border-radius: 24px;
  font-family: monospace;
  z-index: 1000;
}
.zoom-btn {
  width: 32px;
  height: 32px;
  background:#333;
  color:#fff;
  border:none;
  border-radius:50%;
  font-size:18px;
  font-weight:bold;
  cursor:pointer;
}
.zoom-btn:hover { background:#555; transform:scale(1.1); }
.zoom-level { color:#fff; font-weight:bold; min-width:44px; text-align:center; font-size:14px; }

</style>