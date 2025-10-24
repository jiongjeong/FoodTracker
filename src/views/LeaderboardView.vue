<script setup>
import { ref, onMounted } from 'vue'
import { db } from '../firebase.js'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
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
          initials: (data.name ? data.name.trim().split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase() : 'U'),
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
        streak: data.currentStreak || 0,
        initials: (data.name ? data.name.trim().split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase() : 'U'),
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
</script>

<template>
  <div class="container-fluid p-4">
    <div class="mb-4">
      <h1 class="h2 mb-2">Leaderboard</h1>
      <p class="text-muted">Top food savers in Singapore</p>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="text-muted mt-3">Loading leaderboard...</p>
    </div>

    <div v-else>
      <div v-if="userEntry" class="glass-card p-4 mb-4" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.15) 100%);">
        <div class="d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-3">
            <span class="initials-avatar avatar-lg">{{ userEntry.initials }}</span>
            <div>
              <h4 class="mb-1">Your Rank: #{{ userEntry.rank }}</h4>
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
      <div class="glass-card p-4">
        <h3 class="h5 mb-4">Top Users</h3>
        <div class="d-flex flex-column gap-3">
          <div
            v-for="entry in leaderboard"
            :key="entry.rank"
            class="d-flex align-items-center gap-3 p-3 border rounded"
            :class="{ 'bg-light': entry.isCurrentUser }"
          >
            <div
              class="d-flex align-items-center justify-content-center fw-bold"
              style="min-width: 40px; height: 40px;"
              :class="getRankBadgeClass(entry.rank)"
              v-if="entry.rank <= 3"
            >
              #{{ entry.rank }}
            </div>
            <div
              v-else
              class="d-flex align-items-center justify-content-center fw-bold text-muted"
              style="min-width: 40px;"
            >
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
.rank-badge-gold {
  background: linear-gradient(90deg, #ffd700 0%, #fffbe6 100%);
  color: #bfa100;
}
.rank-badge-silver {
  background: linear-gradient(90deg, #c0c0c0 0%, #f8f9fa 100%);
  color: #888;
}
.rank-badge-bronze {
  background: linear-gradient(90deg, #cd7f32 0%, #fbeee6 100%);
  color: #a05a2c;
}
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
</style>