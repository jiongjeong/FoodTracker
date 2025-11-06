<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { db, auth } from '@/firebase'
import { doc, getDoc, getDocs, updateDoc, setDoc, arrayUnion, collection } from 'firebase/firestore'

const currentUser = ref(null)
const allMonkeys = ref([])
const userMonkey = ref({ selected: 'monkey1', unlocked: ['monkey1'] })
const userScore = ref(0)

const chunkCount = ref(3)
const currentSlide = ref(0)


const loadMonkeys = async () => {
  if (!currentUser.value) return
  const userRef = doc(db, 'user', currentUser.value.uid)

  const snap = await getDocs(collection(db, 'monkeys'))
  allMonkeys.value = snap.docs
    .map(d => ({
      id: d.id,
      name: d.data().name || d.id,
      requiredPoints: d.data().requiredPoints ?? 0
    }))
    .sort((a, b) => a.requiredPoints - b.requiredPoints)

  const userSnap = await getDoc(userRef)
  const data = userSnap.data() || {}
  const score = data.foodScore || 0
  userScore.value = data.foodScore || 0

  if (!data.monkey) {
    await setDoc(userRef, { monkey: { selected: 'monkey1', unlocked: ['monkey1'] } }, { merge: true })
    userMonkey.value = { selected: 'monkey1', unlocked: ['monkey1'] }
  } else {
    userMonkey.value = {
      selected: data.monkey.selected || 'monkey1',
      unlocked: Array.isArray(data.monkey.unlocked) ? data.monkey.unlocked : []
    }
  }

  const eligible = allMonkeys.value.filter(m => m.requiredPoints <= score).map(m => m.id)
  const toUnlock = eligible.filter(id => !userMonkey.value.unlocked.includes(id))
  if (toUnlock.length > 0) {
    await updateDoc(userRef, { 'monkey.unlocked': arrayUnion(...toUnlock) })
    userMonkey.value.unlocked.push(...toUnlock)
  }

  updateChunkCount()
  currentSlide.value = 0
}

const updateChunkCount = () => {
  const w = window.innerWidth
  if (w >= 1200) chunkCount.value = 3
  else if (w >= 992) chunkCount.value = 2
  else chunkCount.value = 1



}

const monkeyChunks = computed(() => {
  const chunks = []
  const count = chunkCount.value
  for (let i = 0; i < allMonkeys.value.length; i += count) {
    chunks.push(allMonkeys.value.slice(i, i + count))
  }
  return chunks
})

const selectMonkey = async (monkey) => {
  if (!isUnlocked(monkey)) return
  const userRef = doc(db, 'user', currentUser.value.uid)
  await updateDoc(userRef, { 'monkey.selected': monkey.id })
  userMonkey.value.selected = monkey.id
}

const isUnlocked = (monkey) => userMonkey.value.unlocked.includes(monkey.id)
const isSelected = (monkey) => userMonkey.value.selected === monkey.id

const handleImageError = (e) => { e.target.src = '/monkey/fallback.png' }

const prevSlide = () => { if (currentSlide.value > 0) currentSlide.value-- }
const nextSlide = () => { if (currentSlide.value < monkeyChunks.value.length - 1) currentSlide.value++ }

const handleResize = () => {
  updateChunkCount()
  if (currentSlide.value >= monkeyChunks.value.length) currentSlide.value = monkeyChunks.value.length - 1
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  const unsubscribe = auth.onAuthStateChanged(async (user) => {
    currentUser.value = user
    if (user) await loadMonkeys()
  })
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    unsubscribe()
  })
})
</script>

<template>
  <div class="monkey-selector-row mx-auto" v-if="allMonkeys.length">
    <h5 class="text-center fw-bold text-dark mb-3">Monkeys for Grabs</h5>
    <div class="d-flex align-items-center justify-content-center position-relative mb-3">
      <!-- Left button -->
      <button class="carousel-btn left-btn" @click="prevSlide" :disabled="currentSlide === 0">
        <i class="bi bi-chevron-left"></i>
      </button>

      <!-- Avatars for current slide -->
      <div class="d-flex flex-wrap justify-content-center gap-5 mx-3">
        <div v-for="monkey in monkeyChunks[currentSlide] || []" :key="monkey.id" class="monkey-item text-center"
          :class="{ locked: !isUnlocked(monkey), selected: isSelected(monkey) }" @click="selectMonkey(monkey)"
          :title="isUnlocked(monkey) ? monkey.name : `Locked - Need ${monkey.requiredPoints} pts`">
          <div class="monkey-avatar-wrapper position-relative mx-auto">
            <img :src="`/monkey/${monkey.id}.png`" @error="handleImageError" :alt="monkey.name"
              class="monkey-avatar-img rounded-circle border border-light" />
            <div v-if="!isUnlocked(monkey)" class="lock-overlay d-flex justify-content-center align-items-center">
              <i class="bi bi-lock-fill text-light"></i>
            </div>
            <div v-if="isSelected(monkey)" class="selected-indicator d-flex justify-content-center align-items-center">
              <i class="bi bi-check-circle-fill text-success"></i>
            </div>
          </div>
          <p class="monkey-label mb-0 text-dark" v-if="isUnlocked(monkey)">{{ monkey.name }}</p>
          <p v-else class="points-required mb-0 text-dark">{{ monkey.name }}</p>
          <p class="monkey-label mb-0 text-dark" v-if="isUnlocked(monkey)">{{ monkey.requiredPoints }} pts</p>
          <p v-else class="points-required mb-0 text-dark">{{ monkey.requiredPoints }} pts</p>
        </div>
      </div>

      <!-- Right button -->
      <button class="carousel-btn right-btn" @click="nextSlide" :disabled="currentSlide >= monkeyChunks.length - 1">
        <i class="bi bi-chevron-right"></i>
      </button>
    </div>

    <p class="text-muted text-center mb-0">
      You have <strong class="text-success">{{ userScore }}</strong> food points
    </p>

  </div>
</template>

<style scoped>
.monkey-selector-row {
  padding: 20px 24px;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 2px solid #e5e7eb;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
  overflow-y: hidden;
  max-width: 100%;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.monkey-selector-row::-webkit-scrollbar {
  display: none;
}

.monkeys-container {
  display: flex;
  gap: 16px;
  align-items: center;
  min-width: min-content;
}

.monkey-avatar-wrapper {
  width: 56px;
  height: 56px;
  overflow: hidden;
  border: 2px solid #fff;
  transition: all 0.2s;
}

.monkey-item {
  cursor: pointer;
}

.lock-overlay {
  background: rgba(0, 0, 0, 0.6);
}

.selected-indicator i {
  font-size: 1.2rem;
}

.monkey-label {
  font-weight: 600;
  color: #fff;
  font-size: 0.9rem;
}

.points-required {
  font-size: 0.8rem;
  color: #fbbf24;
}

.monkey-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.monkey-item:hover:not(.locked) {
  transform: translateY(-4px);
}

.monkey-item.locked {
  cursor: not-allowed;
  opacity: 0.5;
}

.monkey-item.selected {
  transform: translateY(-4px);
}

.monkey-avatar-wrapper {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: visible;
  border: 3px solid transparent;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  transition: all 0.2s ease;
}

.monkey-item:not(.locked) .monkey-avatar-wrapper {
  border-color: #FFD700;
}

.monkey-item.selected .monkey-avatar-wrapper {
  border-color: #10b981;
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.6);
}

.monkey-item.locked .monkey-avatar-wrapper {
  border-color: #4b5563;
  filter: grayscale(100%);
}

.monkey-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lock-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 24px;
}

.selected-indicator {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #10b981;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.monkey-label {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  margin: 0;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80px;
}

.monkey-item.locked .monkey-label {
  color: #9ca3af;
}

.points-required {
  font-size: 10px;
  color: #fbbf24;
  margin: 0;
  background: rgba(251, 191, 36, 0.1);
  padding: 2px 8px;
  border-radius: 8px;
}

#monkeyCarousel .carousel-control-prev-icon,
#monkeyCarousel .carousel-control-next-icon {
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 50%;
  width: 40px;
  height: 40px;
}

#monkeyCarousel .carousel-control-prev,
#monkeyCarousel .carousel-control-next {
  filter: none;
}

#monkeyCarousel .visually-hidden {
  color: #000 !important;
}

.carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: rgba(33, 37, 41, 0.9);
  color: #fff;
  font-size: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  transition: all 0.2s ease;
}


.carousel-arrow:hover {
  background: rgba(33, 37, 41, 1);
  transform: translateY(-50%) scale(1.1);
}

.carousel-arrow:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.left-arrow {
  left: -24px;

}

.right-arrow {
  right: -24px;

}
</style>
