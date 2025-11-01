<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { db } from '../firebase.js'
import { collection, getDocs, getDoc, setDoc, query, orderBy, limit, doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
const leaderboard = ref([])
const loading = ref(true)
const error = ref('')
const auth = getAuth()
const currentUser = ref(auth.currentUser)
const userRank = ref(null)
const userEntry = ref(null)

const fetchLeaderboard = async () => {
  loading.value = true
  error.value = ''
  try {
    // Query all users sorted by foodScore desc (for rank)
    const allQ = query(collection(db, 'user'), orderBy('foodScore', 'desc'))
    const allSnap = await getDocs(allQ)
    let foundUser = false
    allSnap.docs.forEach((doc, idx) => {
      if (auth.currentUser && doc.id === auth.currentUser.uid) {
        userRank.value = idx + 1
        const data = doc.data()
        userEntry.value = {
          rank: idx + 1,
          name: data.name || 'Anonymous',
          score: data.foodScore || 0,
          streak: data.currentStreak || 0,
          // TODO: replace initials avatar with actual avatar in the future
          initials: (data.name ? data.name.trim().split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : 'U'),
          isCurrentUser: true
        }
        foundUser = true
      }
    })
    if (!foundUser) {
      userRank.value = null
      userEntry.value = null
    }
    // Top 10 for display
    leaderboard.value = allSnap.docs.slice(0, 10).map((doc, idx) => {
      const data = doc.data()
      return {
        rank: idx + 1,
        name: data.name || 'Anonymous',
        score: data.foodScore || 0,
        streak: data.streak || 0,
        initials: (data.name ? data.name.trim().split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : 'U'),
        isCurrentUser: auth.currentUser && doc.id === auth.currentUser.uid
      }
    })
  } catch (e) {
    error.value = 'Failed to load leaderboard.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchLeaderboard()
  auth.onAuthStateChanged(u => { currentUser.value = u; fetchLeaderboard() })
})

const getRankBadgeClass = (rank) => {
  if (rank === 1) return 'rank-badge-gold'
  if (rank === 2) return 'rank-badge-silver'
  if (rank === 3) return 'rank-badge-bronze'
  return ''
}
console.log(leaderboard)

</script>

<template>
  <div class="container-fluid p-4">
    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="text-muted mt-3">Loading leaderboard...</p>
    </div>

    <div v-else>
      <!-- Podium Header -->
      <div class="podium-container mb-5 m-auto" style="width: 75vw;">
        <div class="podium-background">
          <div class="my-4 ms-4" style="font-family: 'Times New Roman', Times, serif;" >
            <h1 class="h2 m-auto" style="color: white;font-weight: bold;">Leaderboard</h1>
            <p class="text-muted" style="color:white;">Top food savers in Singapore</p>
          </div>
        </div>
        <div class="podium-wrapper">
          <!-- 2nd Place -->
          <div v-if="leaderboard[1]" class="podium-place podium-second">
            <div class="podium-user" :class="{ 'current-user-podium': leaderboard[1].isCurrentUser }">
              <span v-if="leaderboard[1].isCurrentUser" class="you-badge-podium">You</span>
              <span class="initials-avatar avatar-podium">{{ leaderboard[1].initials }}</span>
              <h5 class="mt-3 mb-1">{{ leaderboard[1].name }}</h5>
              <p class="text-muted small mb-2">
                <i class="bi bi-fire text-warning"></i> {{ leaderboard[1].streak }} day streak
              </p>
              <div class="podium-score">
                <i class="bi bi-trophy text-warning"></i>
                <span class="fw-bold">{{ leaderboard[1].score.toLocaleString() }}</span>
              </div>
            </div>
            <div class="podium-stand rank-silver">
              <div class="podium-rank">#2</div>
              <div class="sparkle sparkle-1"></div>
              <div class="sparkle sparkle-2"></div>
              <div class="sparkle sparkle-3"></div>
            </div>
          </div>

          <!-- 1st Place -->
          <div v-if="leaderboard[0]" class="podium-place podium-first">
            <div class="podium-crown">
              <i class="bi bi-award-fill"></i>
            </div>
            <div class="podium-user" :class="{ 'current-user-podium': leaderboard[0].isCurrentUser }">
              <span v-if="leaderboard[0].isCurrentUser" class="you-badge-podium">You</span>
              <span class="initials-avatar avatar-podium avatar-first">{{ leaderboard[0].initials }}</span>
              <h4 class="mt-3 mb-1">{{ leaderboard[0].name }}</h4>
              <p class="text-muted small mb-2">
                <i class="bi bi-fire text-warning"></i> {{ leaderboard[0].streak }} day streak
              </p>
              <div class="podium-score">
                <i class="bi bi-trophy text-warning"></i>
                <span class="fw-bold">{{ leaderboard[0].score.toLocaleString() }}</span>
              </div>
            </div>
            <div class="podium-stand rank-gold">
              <div class="podium-rank">#1</div>
              <div class="sparkle sparkle-1"></div>
              <div class="sparkle sparkle-2"></div>
              <div class="sparkle sparkle-3"></div>
              <div class="sparkle sparkle-4"></div>
            </div>
          </div>

          <!-- 3rd Place -->
          <div v-if="leaderboard[2]" class="podium-place podium-third">
            <div class="podium-user" :class="{ 'current-user-podium': leaderboard[2].isCurrentUser }">
              <span v-if="leaderboard[2].isCurrentUser" class="you-badge-podium">You</span>
              <span class="initials-avatar avatar-podium">{{ leaderboard[2].initials }}</span>
              <h5 class="mt-3 mb-1">{{ leaderboard[2].name }}</h5>
              <p class="text-muted small mb-2">
                <i class="bi bi-fire text-warning"></i> {{ leaderboard[2].streak }} day streak
              </p>
              <div class="podium-score">
                <i class="bi bi-trophy text-warning"></i>
                <span class="fw-bold">{{ leaderboard[2].score.toLocaleString() }}</span>
              </div>
            </div>
            <div class="podium-stand rank-bronze">
              <div class="podium-rank">#3</div>
              <div class="sparkle sparkle-1"></div>
              <div class="sparkle sparkle-2"></div>
              <div class="sparkle sparkle-3"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Your Rank Card (if not in top 3) -->
      <div v-if="userEntry && userEntry.rank > 3" class="glass-card p-4 mb-4"
        style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.15) 100%);">
        <div class="d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-3">
            <span class="initials-avatar avatar-lg">{{ userEntry.initials }}</span>
            <div>
              <h5 class="mb-1">Your Rank: #{{ userEntry.rank }}</h5>
              <p class="mb-0 text-muted">Score: {{ userEntry.score.toLocaleString() }}</p>
            </div>
          </div>
          <div class="text-end">
            <span class="badge bg-warning text-dark">
              <i class="bi bi-fire"></i> {{ userEntry.streak }} day streak
            </span>
          </div>
        </div>
      </div>


      <!-- Rest of Leaderboard -->
      <div class="glass-card p-4">
        <h3 class="h5 mb-4">{{ leaderboard.length > 3 ? 'Rest of the Rankings' : 'All Rankings' }}</h3>
        <div class="d-flex flex-column gap-3">
          <div v-for="entry in leaderboard.slice(3)" :key="entry.rank"
            class="d-flex align-items-center gap-3 p-3 border rounded" :class="{ 'bg-light': entry.isCurrentUser }">
            <div class="d-flex align-items-center justify-content-center fw-bold text-muted" style="min-width: 40px;">
              #{{ entry.rank }}
            </div>

            <span class="initials-avatar">{{ entry.initials }}</span>

            <div class="flex-1">
              <h6 class="mb-1">
                {{ entry.name }}
                <span v-if="entry.isCurrentUser" class="badge bg-primary ms-2">You</span>
              </h6>
              <small class="text-muted">
                <i class="bi bi-fire text-warning"></i> {{ entry.streak }} day streak
              </small>
            </div>

            <div class="text-end">
              <div class="d-flex align-items-center gap-2">
                <i class="bi bi-trophy text-warning"></i>
                <span class="fw-bold">{{ entry.score.toLocaleString() }} pts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Podium Styles */
.podium-container {
  position: relative;
  min-height: 500px;
  margin: 0 -1rem;
  padding-bottom: 2rem;
}

.podium-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  background: linear-gradient(135deg, #0ea5e9 0%, #14b8a6 25%, #10b981 50%, #06b6d4 75%, #3b82f6 100%);
  background-size: 200% 200%;
  animation: gradientShift 8s ease infinite;
  border-radius: 0.5rem;
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.podium-wrapper {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 1rem;
  padding: 2rem 1rem 0;
  max-width: 900px;
  margin: 0 auto;
}

.podium-place {
  flex: 1;
  max-width: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.podium-user {
  text-align: center;
  background: white;
  border-radius: 1rem;
  padding: 1.5rem 1rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
  width: 100%;
}

.podium-stand {
  width: 100%;
  border-radius: 0.5rem 0.5rem 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.5rem;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  position: relative;
  overflow: hidden;
}

.podium-rank {
  color: white;
  font-size: 2rem;
  font-weight: 900;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.rank-gold {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  height: 180px;
}

.rank-silver {
  background: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%);
  height: 140px;
}

.rank-bronze {
  background: linear-gradient(135deg, #cd7f32 0%, #e8a87c 100%);
  height: 100px;
}

.podium-first {
  order: 2;
}

.podium-second {
  order: 1;
}

.podium-third {
  order: 3;
}

.podium-crown {
  font-size: 3rem;
  color: #ffd700;
  text-shadow: 0 2px 8px rgba(255, 215, 0, 0.5);
  animation: float 3s ease-in-out infinite;
  margin-bottom: -1rem;
}

@keyframes float {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-10px);
  }
}

.podium-score {
  background: rgba(255, 193, 7, 0.1);
  padding: 0.5rem 1rem;
  border-radius: 2rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
}

/* Sparkle Animation */
.sparkle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  opacity: 0;
  animation: sparkle 2s infinite;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
}

.sparkle-1 {
  top: 20%;
  left: 20%;
  animation-delay: 0s;
}

.sparkle-2 {
  top: 40%;
  right: 25%;
  animation-delay: 0.6s;
}

.sparkle-3 {
  bottom: 30%;
  left: 30%;
  animation-delay: 1.2s;
}

.sparkle-4 {
  top: 60%;
  right: 20%;
  animation-delay: 1.8s;
}

@keyframes sparkle {

  0%,
  100% {
    opacity: 0;
    transform: scale(0);
  }

  50% {
    opacity: 1;
    transform: scale(1);
  }
}

/* You Badge for Podium */
.you-badge-podium {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #0d6efd;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  z-index: 10;
}

.current-user-podium {
  position: relative;
  border: 3px solid #0d6efd;
  box-shadow: 0 4px 20px rgba(13, 110, 253, 0.3);
}

/* Avatar Styles */
.initials-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #0d6efd;
  color: #fff;
  font-weight: 700;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 1.1rem;
  margin-right: 0.5rem;
  vertical-align: middle;
  line-height: 1;
  user-select: none;
}

.avatar-lg {
  width: 56px;
  height: 56px;
  font-size: 1.5rem;
  margin-right: 0;
}

.avatar-podium {
  width: 70px;
  height: 70px;
  font-size: 1.8rem;
  margin-right: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.avatar-first {
  width: 90px;
  height: 90px;
  font-size: 2.2rem;
  border: 4px solid #ffd700;
}

/* Responsive Design */
@media (max-width: 768px) {
  .podium-wrapper {
    gap: 0.5rem;
    padding: 1.5rem 0.5rem 0;
  }

  .podium-user {
    padding: 1rem 0.5rem;
  }

  .podium-user h4,
  .podium-user h5 {
    font-size: 0.9rem;
  }

  .podium-user .small {
    font-size: 0.7rem;
  }

  .avatar-podium {
    width: 50px;
    height: 50px;
    font-size: 1.3rem;
  }

  .avatar-first {
    width: 60px;
    height: 60px;
    font-size: 1.5rem;
  }

  .podium-score {
    font-size: 0.9rem;
    padding: 0.4rem 0.8rem;
  }

  .rank-gold {
    height: 140px;
  }

  .rank-silver {
    height: 110px;
  }

  .rank-bronze {
    height: 80px;
  }

  .podium-crown {
    font-size: 2rem;
  }

  .you-badge-podium {
    font-size: 0.65rem;
    padding: 0.2rem 0.5rem;
  }
}

.monkey-carousel-container {
  position: relative;
  max-width: 280px;
  margin: 0 auto;
  padding: 0 40px;
}

.monkey-carousel {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  gap: 1rem;
  padding: 1rem 0;
  scrollbar-width: none;
}

.monkey-carousel::-webkit-scrollbar {
  display: none;
}

.monkey-item {
  min-width: 200px;
  max-width: 200px;
  flex: 0 0 auto;
  text-align: center;
  padding: 1rem;
  background: white;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 3px solid transparent;
  scroll-snap-align: center;
}

.monkey-item:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.12);
}

.monkey-item.locked {
  opacity: 0.6;
  cursor: not-allowed;
  filter: grayscale(80%);
}

.monkey-item.selected {
  border-color: #28a745;
  background: #f8fff9;
  box-shadow: 0 8px 20px rgba(40, 167, 69, 0.2);
}

.avatar-wrapper {
  position: relative;
  display: inline-block;
  width: 100px;
  height: 100px;
}

.lock-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  pointer-events: none;
  z-index: 10;
}

.monkey-name {
  font-weight: 600;
  font-size: 0.95rem;
  margin: 0.5rem 0 0;
}

.carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  width: 40px;
  height: 40px;
  color: #555;
  font-size: 1.8rem;
  cursor: pointer;
  z-index: 20;
  transition: color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.carousel-arrow:hover {
  color: #28a745;
}

.carousel-arrow.left { left: 0; }
.carousel-arrow.right { right: 0; }

/* Responsive */
@media (max-width: 480px) {
  .monkey-carousel-container {
    max-width: 220px;
    padding: 0 30px;
  }
  .monkey-item {
    min-width: 160px;
    max-width: 160px;
  }
  .avatar-wrapper { width: 80px; height: 80px; }
}
</style>