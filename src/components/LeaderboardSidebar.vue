<!-- src/components/LeaderboardSidebar.vue -->
<template>
  <div class="sidebar-wrapper" :class="{ collapsed: isCollapsed }">
    <!-- Toggle Button -->
    <button class="toggle-btn btn btn-warning" @click="isCollapsed = !isCollapsed">
      <i :class="isCollapsed ? 'bi bi-chevron-right' : 'bi bi-chevron-left'"></i>
    </button>

    <!-- Content -->
    <div class="sidebar bg-dark text-white p-3">
      <div class="d-flex align-items-center gap-3 mb-3">
        <div class="icon-wrapper bg-warning rounded-circle d-flex align-items-center justify-content-center text-dark">
          <i class="bi bi-trophy-fill fs-4"></i>
        </div>
        <div>
          <h1 class="hero-title mb-1 fw-bold">Leaderboard</h1>
          <p class="hero-subtitle mb-0 text-muted small">
            <i class="bi bi-fire me-1"></i>
            Top food savers
          </p>
        </div>
      </div>

      <div v-for="(u, i) in topUsers" :key="u.uid" class="rank-item d-flex align-items-center gap-2 py-2 border-bottom border-secondary" :class="{ 'bg-warning text-dark fw-bold': u.isYou }">
        <span class="rank fw-bold">#{{ i + 1 }}</span>
        <div class="pixel-monkey" :style="{ backgroundImage: `url(/monkey/${u.monkey}.png)` }"></div>
        <div class="info flex-grow-1">
          <div class="name small">{{ u.name }}</div>
          <small class="score text-muted">{{ u.score }} pts</small>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { db, auth } from '@/firebase'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'

const topUsers = ref([])
const isCollapsed = ref(false)
let unsubscribe

onMounted(() => {
  const uid = auth.currentUser?.uid
  if (!uid) return

  const q = query(collection(db, 'user'), orderBy('foodScore', 'desc'), limit(6))
  unsubscribe = onSnapshot(q, snap => {
    topUsers.value = snap.docs.map(d => ({
      uid: d.id,
      name: d.data().name || 'Anon',
      score: d.data().foodScore || 0,
      monkey: d.data().monkey?.selected || 'monkey1',
      isYou: d.id === uid
    }))
  })
})

onUnmounted(() => unsubscribe?.())
</script>

<style scoped>
.sidebar-wrapper {
  position: fixed;
  right: 0;
  top: 80px;     /* ← below header */
  bottom: 0;
  width: 260px;
  z-index: 1000;
  transition: transform 0.3s ease;
}

.sidebar-wrapper.collapsed {
  transform: translateX(230px);
}

.toggle-btn {
  position: absolute;
  left: -36px;
  top: 16px;
  width: 36px;
  height: 60px;
  border-radius: 8px 0 0 8px;
  box-shadow: -4px 0 12px rgba(0,0,0,0.4);
}

.icon-wrapper {
  width: 44px;
  height: 44px;
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.3);
}

.pixel-monkey {
  width: 32px;
  height: 32px;
  background-size: cover;
  image-rendering: pixelated;
  border: 2px solid #FFD700;
  border-radius: 4px;
}
</style>