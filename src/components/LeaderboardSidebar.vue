<!-- src/components/LeaderboardSidebar.vue -->
<template>
  <div class="sidebar-wrapper" :class="{ collapsed: isCollapsed }">
    <!-- Toggle Button - Always Visible -->
    <button class="toggle-btn btn" @click="isCollapsed = !isCollapsed">
      <i :class="isCollapsed ? 'bi bi-chevron-left' : 'bi bi-chevron-right'"></i>
    </button>

    <!-- Content -->
    <div class="sidebar">
      <div class="sidebar-header d-flex align-items-center gap-3 mb-3 pb-3 border-bottom">
        <div class="icon-wrapper d-flex align-items-center justify-content-center">
          <i class="bi bi-trophy-fill"></i>
        </div>
        <div class="header-text flex-grow-1">
          <h3 class="sidebar-title mb-1">Leaderboard</h3>
          <p class="sidebar-subtitle mb-0 d-flex align-items-center gap-1">
            <i class="bi bi-fire"></i>
            <span>Top players</span>
          </p>
        </div>
      </div>

      <div class="leaderboard-list d-flex flex-column gap-2">
        <div 
          v-for="(u, i) in topUsers" 
          :key="u.uid" 
          class="rank-item d-flex align-items-center gap-3 p-3 rounded-3 position-relative" 
          :class="{ 'is-you': u.isYou }"
        >
          <span class="rank-number fw-bold">#{{ i + 1 }}</span>
          <div class="monkey-avatar" :style="{ backgroundImage: `url(/monkey/${u.monkey}.png)` }"></div>
          <div class="user-info flex-grow-1">
            <div class="user-name fw-semibold">{{ u.name }}</div>
            <div class="user-score small text-muted">{{ u.score }} pts</div>
          </div>
          <span v-if="u.isYou" class="you-badge badge bg-success">You</span>
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
const isCollapsed = ref(true)
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
  top: 50%;
  transform: translateY(-50%);
  width: 300px;
  z-index: 999;
  transition: transform 0.3s ease;
  pointer-events: none;
}

.sidebar-wrapper.collapsed {
  transform: translate(260px, -50%);
}

.sidebar-wrapper > * {
  pointer-events: auto;
}

/* Sidebar Container */
.sidebar {
  height: auto;
  max-height: 70vh;
  border-radius: 16px 0 0 16px;
  background: rgba(255, 255, 255, 0.98);
  border: 2px solid #e5e7eb;
  border-right: none;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1.25rem;
}

.sidebar::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 3px;
}

.sidebar::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* Toggle Button - Always Visible */
.toggle-btn {
  position: absolute;
  left: -40px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 80px;
  border: 2px solid #e5e7eb;
  border-right: none;
  border-radius: 12px 0 0 12px;
  background: rgba(255, 255, 255, 0.98);
  color: #6b7280;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  padding: 0;
}

.toggle-btn:hover {
  background: #fff;
  color: #1a1a1a;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.12);
}

/* Icon Wrapper */
.icon-wrapper {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  border-radius: 50%;
  color: #fff;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
  flex-shrink: 0;
}

.icon-wrapper i {
  font-size: 22px;
}

/* Header Text */
.sidebar-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.2;
}

.sidebar-subtitle {
  font-size: 0.75rem;
  color: #6b7280;
}

.sidebar-subtitle i {
  color: #f59e0b;
  font-size: 0.8125rem;
}

/* Rank Item */
.rank-item {
  background: #f9fafb;
  border: 2px solid #f3f4f6;
  transition: all 0.2s ease;
}

.rank-item:hover {
  background: #f3f4f6;
  transform: translateX(-4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.rank-item.is-you {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(110, 231, 183, 0.1));
  border-color: #10b981;
}

.rank-item.is-you:hover {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(110, 231, 183, 0.15));
}

.rank-number {
  color: #fbbf24;
  font-size: 0.875rem;
  min-width: 28px;
  text-align: center;
  flex-shrink: 0;
}

.monkey-avatar {
  width: 40px;
  height: 40px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
  background-color: #fff;
  flex-shrink: 0;
}

.rank-item.is-you .monkey-avatar {
  border-color: #10b981;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.3);
}

.user-info {
  min-width: 0;
}

.user-name {
  font-size: 0.875rem;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-score {
  color: #6b7280;
  margin-top: 0.125rem;
}

.you-badge {
  font-size: 0.625rem;
  font-weight: 700;
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03125rem;
  flex-shrink: 0;
}

/* Responsive - Hide sidebar content on smaller screens but KEEP toggle button */
@media (max-width: 991.98px) {
  .sidebar-wrapper {
    transform: translateY(-50%);
  }
  
  .sidebar {
    display: none;
  }
  
  .sidebar-wrapper.collapsed .sidebar {
    display: block;
  }
  
  /* Keep toggle button visible and on the right edge */
  .toggle-btn {
    display: flex !important;
    left: -40px;
  }
  
  .sidebar-wrapper.collapsed {
    transform: translate(0, -50%);
  }
  
  .sidebar-wrapper:not(.collapsed) {
    transform: translate(260px, -50%);
  }
}

@media (max-width: 1199.98px) {
  .sidebar-wrapper {
    width: 260px;
  }
  
  .sidebar {
    padding: 1rem;
  }
}

/* Extra small screens */
@media (max-width: 575.98px) {
  .toggle-btn {
    width: 36px;
    height: 70px;
    left: -36px;
    font-size: 16px;
  }
  
  .sidebar-wrapper:not(.collapsed) {
    transform: translate(260px, -50%);
  }
}
</style>