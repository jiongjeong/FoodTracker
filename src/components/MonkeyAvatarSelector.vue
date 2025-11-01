<!-- src/components/MonkeyAvatarSelector.vue -->
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { db, auth } from '@/firebase'
import { doc, getDoc, getDocs, updateDoc, setDoc, arrayUnion, collection } from 'firebase/firestore'

const currentUser = ref(null)
const allMonkeys = ref([])
const userMonkey = ref({ selected: 'monkey1', unlocked: ['monkey1'] })
const currentIndex = ref(0)  // <-- tracks which unlocked monkey is shown

const loadMonkeys = async () => {
  if (!currentUser.value) return
  const userRef = doc(db, 'user', currentUser.value.uid)

  try {
    // 1. Load all monkeys
    const snap = await getDocs(collection(db, 'monkeys'))
    allMonkeys.value = snap.docs.map(d => ({
      id: d.id,
      name: d.data().name || d.id,
      requiredPoints: d.data().requiredPoints ?? 0
    }))

    // 2. Load user
    const userSnap = await getDoc(userRef)
    const data = userSnap.data() || {}
    const score = data.foodScore || 0

    // 3. Initialize
    if (!data.monkey) {
      await setDoc(userRef, {
        monkey: { selected: 'monkey1', unlocked: ['monkey1'] }
      }, { merge: true })
      userMonkey.value = { selected: 'monkey1', unlocked: ['monkey1'] }
    } else {
      userMonkey.value = {
        selected: data.monkey.selected || 'monkey1',
        unlocked: Array.isArray(data.monkey.unlocked) ? data.monkey.unlocked : []
      }
    }

    // 4. Auto-unlock
    const eligible = allMonkeys.value.filter(m => m.requiredPoints <= score).map(m => m.id)
    const toUnlock = eligible.filter(id => !userMonkey.value.unlocked.includes(id))
    if (toUnlock.length > 0) {
      await updateDoc(userRef, { 'monkey.unlocked': arrayUnion(...toUnlock) })
      userMonkey.value.unlocked.push(...toUnlock)
    }

    // 5. Set current index to selected
    currentIndex.value = userMonkey.value.unlocked.indexOf(userMonkey.value.selected)
    if (currentIndex.value === -1) currentIndex.value = 0
  } catch (err) {
    console.error('Monkey load error:', err)
  }
}

const selectAndShow = async (index) => {
  const id = userMonkey.value.unlocked[index]
  if (!id) return

  const userRef = doc(db, 'user', currentUser.value.uid)
  await updateDoc(userRef, { 'monkey.selected': id })
  userMonkey.value.selected = id
  currentIndex.value = index
}

const next = () => {
  if (userMonkey.value.unlocked.length === 0) return
  const nextIdx = (currentIndex.value + 1) % userMonkey.value.unlocked.length
  selectAndShow(nextIdx)
}

const prev = () => {
  if (userMonkey.value.unlocked.length === 0) return
  const prevIdx = (currentIndex.value - 1 + userMonkey.value.unlocked.length) % userMonkey.value.unlocked.length
  selectAndShow(prevIdx)
}

onMounted(() => {
  const unsubscribe = auth.onAuthStateChanged(async (user) => {
    currentUser.value = user
    if (user) await loadMonkeys()
  })
  onUnmounted(() => unsubscribe())
})
</script>

<template>
  <div class="monkey-selector d-flex align-items-center gap-2">
    <!-- Left Arrow -->
    <button @click="prev" class="btn btn-sm btn-dark rounded-circle">
      <i class="bi bi-chevron-left"></i>
    </button>

    <!-- Single Monkey -->
    <div v-if="userMonkey.unlocked.length > 0" class="current-monkey text-center">
      <div class="avatar-wrapper position-relative">
        <img
          :src="`/monkey/${userMonkey.unlocked[currentIndex]}.png`"
          @error="handleImageError"
          :alt="allMonkeys.find(m => m.id === userMonkey.unlocked[currentIndex])?.name"
          class="monkey-img"
        />
      </div>
      <p class="monkey-name mt-1 mb-0">
        {{ allMonkeys.find(m => m.id === userMonkey.unlocked[currentIndex])?.name || 'Monkey' }}
      </p>
    </div>

    <div v-else class="placeholder d-flex align-items-center justify-content-center text-white">
      <i class="bi bi-person-fill"></i>
    </div>

    <!-- Right Arrow -->
    <button @click="next" class="btn btn-sm btn-dark rounded-circle">
      <i class="bi bi-chevron-right"></i>
    </button>

    <!-- Badge -->
    <div class="badge-info ms-2">
      <span class="badge bg-success small">
        {{ userMonkey.unlocked.length }} / {{ allMonkeys.length }}
      </span>
    </div>
  </div>
</template>

<script>
// Fallback image handler (pure JS)
function handleImageError(e) {
  e.target.src = '/monkey/fallback.png'
}
</script>

<style scoped>
.monkey-selector {
  background: rgba(0,0,0,0.5);
  padding: 8px 12px;
  border-radius: 16px;
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255,215,0,0.3);
}

.avatar-wrapper {
  width: 56px;
  height: 56px;
  margin: 0 auto;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #FFD700;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

.monkey-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}

.placeholder {
  width: 56px;
  height: 56px;
  background: #444;
  border-radius: 50%;
  font-size: 1.8rem;
}

.monkey-name {
  font-size: 0.75rem;
  color: #fff;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70px;
}
</style>