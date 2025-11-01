<!-- src/components/PodiumLeaderboard.vue -->
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
        name: name,
        initials: initials,
        monkeyId: data.monkey?.selected || 'monkey1',
        score: data.foodScore || 0,
        streak: data.streak || 0,
        isCurrentUser: d.id === currentUserId.value
      }
    })
  })
})

// Reorder for podium display: [2nd, 1st, 3rd]
const podiumOrder = computed(() => {
  if (topPlayers.value.length < 2) return topPlayers.value
  return [
    topPlayers.value[1], // 2nd place
    topPlayers.value[0], // 1st place
    topPlayers.value[2]  // 3rd place
  ].filter(Boolean)
})
</script>

<template>
  <div class="podium-leaderboard bg-white rounded shadow p-3 mx-auto" style="max-width: 90%;">
    <div class="podium-title d-flex align-items-center justify-content-center gap-2 text-black fs-4 fw-bold mb-3">
      <i class="bi bi-trophy-fill"></i>
      Top Players
    </div>

    <div class="podium-wrapper d-flex align-items-end justify-content-center gap-2 px-2">
      <!-- 2nd Place -->
      <div v-if="podiumOrder[0]" class="podium-place text-center">
        <div class="podium-user position-relative p-2 rounded bg-light">
          <span v-if="podiumOrder[0].isCurrentUser" class="badge bg-success position-absolute top-0 start-50 translate-middle-x" style="font-size:0.6rem;">You</span>
          <img 
            :src="`/monkey/${podiumOrder[0].monkeyId}.png`" 
            :alt="podiumOrder[0].name"
            class="rounded-circle border border-dark"
            style="width:50px; height:50px;"
          />
          <div class="podium-name text-black fw-semibold text-truncate" style="max-width:70px;">{{ podiumOrder[0].name }}</div>
          <div class="podium-score text-black fw-bold bg-success bg-opacity-10 rounded px-1">{{ podiumOrder[0].score }}</div>
        </div>
        <div class="podium-stand bg-secondary rounded-top" style="height:55px; width:70px;">
          <div class="podium-rank text-black fw-bold fs-5">#2</div>
        </div>
      </div>

      <!-- 1st Place -->
      <div v-if="podiumOrder[1]" class="podium-place text-center">
        <div class="podium-crown text-warning fs-3 position-absolute" style="top:-20px;"><i class="bi bi-award-fill"></i></div>
        <div class="podium-user position-relative p-2 rounded bg-light">
          <span v-if="podiumOrder[1].isCurrentUser" class="badge bg-success position-absolute top-0 start-50 translate-middle-x" style="font-size:0.6rem;">You</span>
          <img 
            :src="`/monkey/${podiumOrder[1].monkeyId}.png`" 
            :alt="podiumOrder[1].name"
            class="rounded-circle border border-dark"
            style="width:60px; height:60px;"
          />
          <div class="podium-name text-black fw-semibold text-truncate" style="max-width:70px;">{{ podiumOrder[1].name }}</div>
          <div class="podium-score text-black fw-bold bg-success bg-opacity-10 rounded px-1">{{ podiumOrder[1].score }}</div>
        </div>
        <div class="podium-stand bg-warning rounded-top" style="height:70px; width:70px;">
          <div class="podium-rank text-black fw-bold fs-5">#1</div>
        </div>
      </div>

      <!-- 3rd Place -->
      <div v-if="podiumOrder[2]" class="podium-place text-center">
        <div class="podium-user position-relative p-2 rounded bg-light">
          <span v-if="podiumOrder[2].isCurrentUser" class="badge bg-success position-absolute top-0 start-50 translate-middle-x" style="font-size:0.6rem;">You</span>
          <img 
            :src="`/monkey/${podiumOrder[2].monkeyId}.png`" 
            :alt="podiumOrder[2].name"
            class="rounded-circle border border-dark"
            style="width:50px; height:50px;"
          />
          <div class="podium-name text-black fw-semibold text-truncate" style="max-width:70px;">{{ podiumOrder[2].name }}</div>
          <div class="podium-score text-black fw-bold bg-success bg-opacity-10 rounded px-1">{{ podiumOrder[2].score }}</div>
        </div>
        <div class="podium-stand bg-warning rounded-top" style="height:45px; width:70px;">
          <div class="podium-rank text-black fw-bold fs-5">#3</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.podium-leaderboard {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border: 2px solid #e5e7eb;
  min-width: 360px;
  margin: 0 auto;
  max-width: 90%;
}

.podium-title {
  font-size: 14px;
  font-weight: 700;
  color: #fbbf24;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
}

.podium-wrapper {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 8px;
  padding: 0 8px;
}

.podium-place {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.podium-user {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  position: relative;
  padding: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.2s;
}

.podium-user:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.podium-user.current-user {
  background: rgba(16, 185, 129, 0.1);
  border: 2px solid #10b981;
}

.you-badge {
  position: absolute;
  top: -8px;
  background: #10b981;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
}

.podium-crown {
  position: absolute;
  top: -16px;
  font-size: 24px;
  color: #fbbf24;
  animation: bounce 2s infinite;
  z-index: 10;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.podium-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #fbbf24;
  image-rendering: pixelated;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.podium-avatar-first {
  width: 48px;
  height: 48px;
  border: 3px solid #fbbf24;
  box-shadow: 0 0 16px rgba(251, 191, 36, 0.5);
}

.podium-name {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  text-align: center;
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.podium-score {
  font-size: 10px;
  font-weight: 700;
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  padding: 2px 6px;
  border-radius: 8px;
}

.podium-stand {
  width: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px 8px 0 0;
  position: relative;
  overflow: hidden;
}

.podium-rank {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  z-index: 2;
  padding: 8px 0;
}

.rank-gold {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  height: 70px;
  box-shadow: 0 0 20px rgba(251, 191, 36, 0.4);
}

.rank-silver {
  background: linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%);
  height: 55px;
  box-shadow: 0 0 16px rgba(209, 213, 219, 0.3);
}

.rank-bronze {
  background: linear-gradient(135deg, #cd7f32 0%, #b8733a 100%);
  height: 45px;
  box-shadow: 0 0 16px rgba(205, 127, 50, 0.3);
}

/* Podium order */
.podium-second {
  order: 1;
}

.podium-first {
  order: 2;
}

.podium-third {
  order: 3;
}

/* Responsive */
@media (max-width: 768px) {
  .podium-leaderboard {
    min-width: 280px;
    padding: 10px;
  }
  
  .podium-wrapper {
    gap: 6px;
  }
  
  .podium-stand {
    width: 60px;
  }
  
  .podium-avatar {
    width: 36px;
    height: 36px;
  }
  
  .podium-avatar-first {
    width: 42px;
    height: 42px;
  }
  
  .rank-gold {
    height: 60px;
  }
  
  .rank-silver {
    height: 48px;
  }
  
  .rank-bronze {
    height: 40px;
  }
}

@media (max-width: 576px) {
  .podium-leaderboard {
    min-width: 240px;
  }
  
  .podium-stand {
    width: 50px;
  }
  
  .podium-name {
    font-size: 10px;
    max-width: 60px;
  }
}
</style>