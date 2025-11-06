<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { db, auth } from '@/firebase'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import LeaderboardSidebar from '@/components/bigbacksville/LeaderboardSidebar.vue'
import VillageHeader from '@/components/bigbacksville/VillageHeader.vue'

/* ---------- REFS ---------- */
const panContainer = ref(null)
const villageImg = ref(null)
const allMonkeys = ref([])
const hoveredMonkey = ref(null)
const jumpingMonkeys = ref(new Set())
const celebratingMonkeys = ref(new Set())
const bananas = ref([])
const collectedBananas = ref(0)

/* ---------- PAN ---------- */
const isPanning = ref(false)
const startX = ref(0)
const startY = ref(0)
const translateX = ref(0)
const translateY = ref(0)

/* ---------- KEYBOARD CONTROL ---------- */
const keyboardControl = ref(false)
const moveSpeed = 1 // percentage points per frame

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
  
  // Start spawning bananas
  bananaInterval = setInterval(spawnBanana, 10000)
  spawnBanana() // Spawn first banana immediately
})

onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
  if (bananaInterval) clearInterval(bananaInterval)
})

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
      if (m.isYou && keyboardControl.value) {
        return
      }

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

      if (m.isYou) {
        checkBananaCollection(m)
      }
    })

    animationFrame = requestAnimationFrame(walk)
  }
  walk()
}

/* ---------- BANANA COLLECTION CHECK ---------- */
const checkBananaCollection = (monkey) => {
  const collectionRadius = 3 // percentage points
  
  bananas.value.forEach(banana => {
    if (!banana.collectible) return
    
    const dx = monkey.pos.x - banana.x
    const dy = monkey.pos.y - banana.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance < collectionRadius) {
      collectBanana(banana)
    }
  })
}

/* ---------- INTERACTIVE FEATURES ---------- */
const onMonkeyClick = (monkey) => {
  // Make monkey jump
  jumpingMonkeys.value.add(monkey.uid)
  setTimeout(() => {
    jumpingMonkeys.value.delete(monkey.uid)
  }, 600)
}

const onMonkeyDoubleClick = (monkey) => {
  // Make monkey celebrate
  celebratingMonkeys.value.add(monkey.uid)
  setTimeout(() => {
    celebratingMonkeys.value.delete(monkey.uid)
  }, 1000)
  
  // Spawn confetti emojis
  spawnConfetti(monkey.pos.x, monkey.pos.y)
}

const spawnConfetti = (x, y) => {
  const emojis = ['🎉', '⭐', '🍌', '💫', '✨']
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI * 2 * i) / 5
    const id = Date.now() + i
    bananas.value.push({
      id,
      emoji: emojis[i % emojis.length],
      x: x,
      y: y,
      targetX: x + Math.cos(angle) * 8,
      targetY: y + Math.sin(angle) * 8,
      opacity: 1
    })
    
    setTimeout(() => {
      bananas.value = bananas.value.filter(b => b.id !== id)
    }, 1000)
  }
}

// Spawn collectible bananas periodically
const spawnBanana = () => {
  const pos = getRandomLandPosition()
  bananas.value.push({
    id: Date.now(),
    emoji: '🍌',
    x: pos.x,
    y: pos.y,
    collectible: true,
    opacity: 1
  })
}

const collectBanana = (banana) => {
  if (!banana.collectible) return
  
  collectedBananas.value++
  banana.opacity = 0
  
  setTimeout(() => {
    bananas.value = bananas.value.filter(b => b.id !== banana.id)
  }, 300)
}

/* ---------- KEYBOARD CONTROL ---------- */
const handleKeyDown = (e) => {
  const yourMonkey = allMonkeys.value.find(m => m.isYou)
  if (!yourMonkey) return

  const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd']
  if (!keys.includes(e.key)) return

  e.preventDefault()
  keyboardControl.value = true

  let newX = yourMonkey.pos.x
  let newY = yourMonkey.pos.y

  switch(e.key) {
    case 'ArrowUp':
    case 'w':
      newY -= moveSpeed
      break
    case 'ArrowDown':
    case 's':
      newY += moveSpeed
      break
    case 'ArrowLeft':
    case 'a':
      newX -= moveSpeed
      break
    case 'ArrowRight':
    case 'd':
      newX += moveSpeed
      break
  }

  const clamped = clampToLand(newX, newY)
  yourMonkey.pos.x = clamped.x
  yourMonkey.pos.y = clamped.y
  yourMonkey.target.x = clamped.x
  yourMonkey.target.y = clamped.y

  // Check for banana collection on keyboard movement
  checkBananaCollection(yourMonkey)
}

// Spawn bananas every 10 seconds
let bananaInterval = null
onMounted(() => {
  // ... existing onMounted code ...
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
  
  // Start spawning bananas
  bananaInterval = setInterval(spawnBanana, 10000)
  spawnBanana() // Spawn first banana immediately

  // Add keyboard event listener
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
  if (bananaInterval) clearInterval(bananaInterval)
  window.removeEventListener('keydown', handleKeyDown)
})

/* ---------- PANNING ---------- */
const startPan = e => {
  // Only allow panning on small viewports (<=576px)
  if (window.innerWidth > 576) return

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

  // Calculate new translate values
  let newX = clientX - startX.value
  let newY = clientY - startY.value

  // Get container and image dimensions
  if (panContainer.value && villageImg.value) {
    const containerRect = panContainer.value.getBoundingClientRect()
    const imgRect = villageImg.value.getBoundingClientRect()

    // Calculate max pan distances (allow panning to see full image)
    const maxPanLeft = 0
    const maxPanRight = Math.min(0, containerRect.width - imgRect.width)
    const maxPanTop = 0
    const maxPanBottom = Math.min(0, containerRect.height - imgRect.height)

    // Constrain the translation
    newX = Math.max(maxPanRight, Math.min(maxPanLeft, newX))
    newY = Math.max(maxPanBottom, Math.min(maxPanTop, newY))
  }

  translateX.value = newX
  translateY.value = newY
}

const endPan = () => {
  isPanning.value = false
  if (panContainer.value) {
    panContainer.value.style.cursor = window.innerWidth <= 576 ? 'grab' : 'default'
  }
}

/* ---------- STYLE ---------- */
const panStyle = computed(() => {
  const canPan = window.innerWidth <= 576
  return {
    transform: `translate(${translateX.value}px, ${translateY.value}px)`,
    transformOrigin: 'top left',
    cursor: canPan ? (isPanning.value ? 'grabbing' : 'grab') : 'default'
  }
})

const monkeyStyle = m => ({
  position: 'absolute',
  left: `${m.pos.x}%`,
  top: `${m.pos.y}%`,
  transform: 'translate(-50%, -50%)',
  width: '64px',
  height: '64px',
  zIndex: m.isYou ? 100 : 50,
  pointerEvents: 'auto',
  transition: (m.isYou && keyboardControl.value) ? 'none' : (m.isYou ? 'none' : 'left 0.1s linear, top 0.1s linear'),
  cursor: 'pointer'
})

const bananaStyle = b => ({
  position: 'absolute',
  left: `${b.targetX || b.x}%`,
  top: `${b.targetY || b.y}%`,
  transform: 'translate(-50%, -50%)',
  fontSize: '24px',
  opacity: b.opacity,
  transition: 'all 0.8s ease-out',
  pointerEvents: b.collectible ? 'auto' : 'none',
  cursor: b.collectible ? 'pointer' : 'default',
  zIndex: 40
})

// on hover, change to banana monkey
const monkeySrc = (monkey) => {
  const isHovered = hoveredMonkey.value === monkey.uid
  const normal = `/monkey/${monkey.monkeyId}.png`
  const banana = `/bananagif-unscreen.gif` 
  return isHovered ? banana : normal
}

const onHover = (uid) => { hoveredMonkey.value = uid }
const onHoverLeave = () => { hoveredMonkey.value = null }
</script>

<template>
    <VillageHeader />

    <div class="village-page">
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
          :class="{ 
            you: monkey.isYou, 
            hover: hoveredMonkey === monkey.uid,
            jumping: jumpingMonkeys.has(monkey.uid),
            celebrating: celebratingMonkeys.has(monkey.uid)
          }"
          :style="monkeyStyle(monkey)"
          @click="onMonkeyClick(monkey)"
          @dblclick="onMonkeyDoubleClick(monkey)"
        >
        <img
          :src="monkeySrc(monkey)"
          class="monkey-img"
          @mouseenter="onHover(monkey.uid)"
          @mouseleave="onHoverLeave"
          alt=""
        />

          <!-- POPUP -->
          <div v-if="hoveredMonkey === monkey.uid" class="popup">
            <div class="popup-name">{{ monkey.name }}</div>
            <div class="popup-score">Score: {{ monkey.score }}</div>
            <div v-if="monkey.isYou" class="popup-hint">🎮 Use arrow keys or WASD to move!</div>
            <div v-else class="popup-hint">Click to jump • Double-click for fun!</div>
          </div>

          <!-- Labels -->
          <div v-if="monkey.isYou" class="you-label">You</div>
          <div v-else class="name-label">{{ monkey.name }}</div>
        </div>

        <!-- Collectible Bananas & Confetti -->
        <div
          v-for="banana in bananas"
          :key="banana.id"
          class="banana"
          :class="{ collectible: banana.collectible }"
          :style="bananaStyle(banana)"
          @click="collectBanana(banana)"
        >
          {{ banana.emoji }}
        </div>

        <!-- Banana Counter -->
        <div class="banana-counter">
          <span class="banana-icon">🍌</span>
          <span class="banana-count">{{ collectedBananas }}</span>
        </div>
      </div>

      <LeaderboardSidebar />
    </div>
</template>

<style scoped>

.village-page {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: transparent;
  user-select: none;
  cursor: grab;
  touch-action: none; 
}

.pan-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 100vh;
}

.village-bg {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  object-fit: cover;
  object-position: center;
  display: block;
  image-rendering: auto;
  pointer-events: none;
}

/* ---------- MONKEYS ---------- */
.monkey {
  position: absolute;
  width: 64px;
  height: 64px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.monkey.jumping {
  animation: jumpAnimation 0.6s ease;
}

.monkey.celebrating {
  animation: celebrateAnimation 1s ease;
}

@keyframes jumpAnimation {
  0%, 100% { transform: translate(-50%, -50%) translateY(0) scale(1); }
  50% { transform: translate(-50%, -50%) translateY(-30px) scale(1.1); }
}

@keyframes celebrateAnimation {
  0%, 100% { transform: translate(-50%, -50%) rotate(0deg) scale(1); }
  25% { transform: translate(-50%, -50%) rotate(-15deg) scale(1.15); }
  75% { transform: translate(-50%, -50%) rotate(15deg) scale(1.15); }
}

.monkey-img {
  width: 100%;
  height: 100%;
  image-rendering: auto;
  transition: all 0.2s ease;
}

.monkey-img:hover {
  filter: brightness(1.2) drop-shadow(0 0 12px #FFD700);
  transform: scale(1.15);
}

.monkey.you .monkey-img {
  filter: drop-shadow(0 0 8px #FFD700);
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

.popup-name {
  color: #FFD700;
  font-size: 13px;
  font-weight: bold;
}

.popup-score {
  color: #aaa;
  font-size: 11px;
  margin-top: 1px;
}

.popup-hint {
  color: #6ee7b7;
  font-size: 10px;
  margin-top: 3px;
  font-style: italic;
}

@keyframes popupFade {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* ---------- BANANAS ---------- */
.banana {
  position: absolute;
  font-size: 24px;
  transition: all 0.8s ease-out;
  user-select: none;
  z-index: 40;
}

.banana.collectible {
  cursor: pointer;
  animation: bananaFloat 2s ease-in-out infinite;
}

.banana.collectible:hover {
  transform: translate(-50%, -50%) scale(1.3);
  filter: drop-shadow(0 0 8px #FFD700);
}

@keyframes bananaFloat {
  0%, 100% { transform: translate(-50%, -50%) translateY(0) rotate(0deg); }
  50% { transform: translate(-50%, -50%) translateY(-10px) rotate(10deg); }
}

/* ---------- BANANA COUNTER ---------- */
.banana-counter {
  position: absolute;
  top: 20px;
  right: 20px;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  border: 3px solid #000;
  border-radius: 20px;
  padding: 10px 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,.3);
  z-index: 1000;
  font-family: monospace;
  pointer-events: none;
}

.banana-icon {
  font-size: 24px;
  animation: bananaWiggle 1s ease-in-out infinite;
}

.banana-count {
  font-size: 20px;
  font-weight: bold;
  color: #000;
  min-width: 30px;
  text-align: center;
}

@keyframes bananaWiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-10deg); }
  75% { transform: rotate(10deg); }
}

/* ---------- RESPONSIVE ---------- */
@media (max-width: 768px) {
  .monkey {
    width: 48px;
    height: 48px;
  }

  .you-label {
    top: -40px;
    font-size: 12px;
    padding: 4px 10px;
  }

  .name-label {
    bottom: -20px;
    font-size: 9px;
    padding: 2px 6px;
  }

  .popup {
    padding: 5px 8px;
  }

  .popup-name {
    font-size: 11px;
  }

  .popup-score {
    font-size: 10px;
  }

  .popup-hint {
    font-size: 9px;
  }

  .banana-counter {
    top: 15px;
    right: 15px;
    padding: 8px 16px;
  }

  .banana-icon {
    font-size: 20px;
  }

  .banana-count {
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .monkey {
    width: 40px;
    height: 40px;
  }

  .monkey-img {
    border-width: 2px;
  }

  .you-label {
    top: -35px;
    font-size: 11px;
    padding: 3px 8px;
  }

  .name-label {
    bottom: -18px;
    font-size: 8px;
    padding: 1px 5px;
  }

  .popup {
    padding: 4px 7px;
  }

  .popup-name {
    font-size: 10px;
  }

  .popup-score {
    font-size: 9px;
  }

  .popup-hint {
    font-size: 8px;
  }

  .banana {
    font-size: 20px;
  }

  .banana-counter {
    top: 10px;
    right: 10px;
    padding: 6px 12px;
    border-radius: 15px;
  }

  .banana-icon {
    font-size: 18px;
  }

  .banana-count {
    font-size: 16px;
    min-width: 25px;
  }
}

/* Landscape mobile optimization */
@media (max-width: 768px) and (orientation: landscape) {
  .village-page {
    height: 100vh;
  }
}
</style>
