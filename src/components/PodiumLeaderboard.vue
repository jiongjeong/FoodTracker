<script setup>
import { ref, computed, onMounted } from 'vue'
import { db, auth } from '@/firebase'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'

const topPlayers = ref([])
const currentUserId = computed(() => auth.currentUser?.uid)

onMounted(() => {
  const q = query(collection(db, 'user'), orderBy('foodScore', 'desc'), limit(3))
  onSnapshot(q, snap => {
    topPlayers.value = snap.docs.map(d => {
      const data = d.data()
      const name = data.name || 'Anon'
      const nameParts = name.trim().split(' ')
      const initials = nameParts.length >= 2 
        ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
        : name[0]?.toUpperCase() || 'U'
      return {
        uid: d.id,
        name,
        initials,
        monkeyId: data.monkey?.selected || 'monkey1',
        score: data.foodScore || 0,
        streak: data.streak || 0,
        isCurrentUser: d.id === currentUserId.value
      }
    })
  })
})

const podiumOrder = computed(() => {
  if (topPlayers.value.length < 2) return topPlayers.value
  return [
    topPlayers.value[1], // 2nd
    topPlayers.value[0], // 1st
    topPlayers.value[2]  // 3rd
  ].filter(Boolean)
})
</script>

<template>
<div class="podium-leaderboard card shadow-lg border-0 mx-auto p-4">
    <!-- Title - Now ABOVE crown -->
    <h2 class="podium-title text-success fw-bold text-center fs-4 mb-8 position-relative">
      <i class="bi bi-trophy-fill me-2"></i>BigBacksVille Leaderboard
    </h2>

    <!-- Podium Row - Vertically Centered -->
    <div class="podium-wrapper d-flex justify-content-center align-items-end flex-nowrap gap-4 h-100">
      <!-- 2nd Place -->
      <div v-if="podiumOrder[0]" class="podium-place text-center animate-on-load pulse">
        <div class="podium-container d-flex flex-column align-items-center">
          <span v-if="podiumOrder[0].isCurrentUser" class="badge bg-success position-absolute top-0 start-50 translate-middle-x">You</span>
          <div class="podium-user bg-light rounded p-3">
            <img :src="`/monkey/${podiumOrder[0].monkeyId}.png`" class="rounded-circle border border-dark mb-2 podium-avatar" />
            <div class="fw-semibold text-truncate mx-auto">{{ podiumOrder[0].name }}</div>
            <div class="fw-bold text-success bg-success bg-opacity-10 rounded px-2 mt-1">{{ podiumOrder[0].score }}</div>
          </div>
          <div class="podium-stand rank-silver d-flex align-items-center justify-content-center rounded-top mt-1">
            <span class="fw-bold text-white">#2</span>
          </div>
        </div>
      </div>

      <!-- 1st Place -->
      <div v-if="podiumOrder[1]" class="podium-place text-center position-relative animate-on-load pulse" style="animation-delay: 0.2s;">
        <div class="podium-container d-flex flex-column align-items-center">
          <!-- Crown is INSIDE podium-container, BELOW title -->
          <div class="podium-crown text-warning position-absolute">
            <i class="bi bi-award-fill"></i>
          </div>
          <span v-if="podiumOrder[1].isCurrentUser" class="badge bg-success position-absolute top-0 start-50 translate-middle-x">You</span>
          <div class="podium-user bg-light rounded p-3 z-1">
            <img :src="`/monkey/${podiumOrder[1].monkeyId}.png`" class="rounded-circle border border-dark mb-2 podium-avatar-lg" />
            <div class="fw-semibold text-truncate mx-auto">{{ podiumOrder[1].name }}</div>
            <div class="fw-bold text-success bg-success bg-opacity-10 rounded px-2 mt-1">{{ podiumOrder[1].score }}</div>
          </div>
          <div class="podium-stand rank-gold d-flex align-items-center justify-content-center rounded-top mt-1">
            <span class="fw-bold text-white">#1</span>
          </div>
        </div>
      </div>

      <!-- 3rd Place -->
      <div v-if="podiumOrder[2]" class="podium-place text-center animate-on-load pulse" style="animation-delay: 0.4s;">
        <div class="podium-container d-flex flex-column align-items-center">
          <span v-if="podiumOrder[2].isCurrentUser" class="badge bg-success position-absolute top-0 start-50 translate-middle-x">You</span>
          <div class="podium-user bg-light rounded p-3">
            <img :src="`/monkey/${podiumOrder[2].monkeyId}.png`" class="rounded-circle border border-dark mb-2 podium-avatar" />
            <div class="fw-semibold text-truncate mx-auto">{{ podiumOrder[2].name }}</div>
            <div class="fw-bold text-success bg-success bg-opacity-10 rounded px-2 mt-1">{{ podiumOrder[2].score }}</div>
          </div>
          <div class="podium-stand rank-bronze d-flex align-items-center justify-content-center rounded-top mt-1">
            <span class="fw-bold text-white">#3</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.podium-leaderboard {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 1.2rem;
  width: 100%;
  max-width: 950px;
  min-height: 520px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2rem;
}
.podium-title {
  font-weight: 700;
  margin-bottom: 3rem !important;
  z-index: 10;
  
}

.podium-wrapper {
  gap: 1.5rem;
  align-items: flex-end;
}

.podium-place {
  flex: 1;
  max-width: 200px;
  transition: transform 0.3s ease;
}
.podium-place:hover {
  transform: translateY(-6px);
}

.podium-user {
  width: 100%;
  transition: transform 0.3s ease;
}
.podium-user:hover {
  transform: scale(1.05);
}

.podium-avatar {
  width: 70px;
  height: 70px;
}
.podium-avatar-lg {
  width: 85px;
  height: 85px;
}

/* Equal width podiums */
.podium-stand {
  width: 100%;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 4px 10px rgba(251, 191, 36, 0.4);
  transition: transform 0.3s ease;
}
.podium-stand:hover {
  transform: translateY(-4px);
}

.rank-gold {
  height: 110px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
}
.rank-silver {
  height: 85px;
  background: linear-gradient(135deg, #d1d5db, #9ca3af);
}
.rank-bronze {
  height: 70px;
  background: linear-gradient(135deg, #cd7f32, #b8733a);
}

/* Crown */
.podium-crown {
  top: -45px; /* adjust so it’s above the user card */
  left: 50%;
  transform: translateX(-50%);
  font-size: 3rem;
  animation: bounce 2s infinite ease-in-out;
  z-index: 10;
}

.podium-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

/* Entrance + pulse animations */
.animate-on-load {
  opacity: 0;
  transform: translateY(20px);
  animation: fadeUp 0.8s ease forwards;
}
@keyframes fadeUp {
  to { opacity: 1; transform: translateY(0); }
}

@keyframes bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-6px); }
}

.pulse {
  animation: fadeUp 0.8s ease forwards, pulseEffect 2.2s ease-in-out infinite;
}
@keyframes pulseEffect {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}

/* Responsive */
@media (max-width: 992px) {
  .podium-avatar { width: 60px; height: 60px; }
  .podium-avatar-lg { width: 75px; height: 75px; }
  .podium-stand { width: 100%; }
  .rank-gold { height: 90px; }
  .rank-silver { height: 70px; }
  .rank-bronze { height: 60px; }
  .podium-crown { font-size: 2.4rem; top: -40px; }
}

@media (max-width: 768px) {
  .podium-wrapper { gap: 1rem; }
  .podium-stand { width: 100%; }
  .rank-gold { height: 80px; }
  .rank-silver { height: 65px; }
  .rank-bronze { height: 55px; }
  .podium-crown { font-size: 2rem; top: -32px; }
}
</style>
