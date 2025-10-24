<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-white border-bottom sticky-top">
    <div class="container-fluid d-flex justify-content-between align-items-center">
      <!-- Brand -->
      <RouterLink
        to="/dashboard"
        class="navbar-brand fw-bold text-primary p-2 text-decoration-none"
        exact-active-class="active"
        @click="closeNavbar"
      >
        <img src="/bigbackicon.jpg" alt="Logo" class="me-2" style="height: 40px; border-radius: 50%;" />
        BigBack
      </RouterLink>

      <!-- Mobile hamburger button (auto-hidden on lg+) -->
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
        @click="toggleNavbar"
        aria-controls="navbarNav"
        :aria-expanded="navbarOpen.toString()"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <!-- Collapsible navbar content -->
      <div class="collapse navbar-collapse flex-grow-1" id="navbarNav" :class="{ show: navbarOpen }">
        <ul class="navbar-nav mx-auto">
          <li class="nav-item">
            <RouterLink
              to="/dashboard"
              class="nav-link"
              exact-active-class="active"
              @click="closeNavbar"
            >
              <i class="bi bi-house-door me-1"></i>Dashboard
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink
              to="/recipes"
              class="nav-link"
              exact-active-class="active"
              @click="closeNavbar"
            >
              <i class="bi bi-egg-fried me-1"></i>Recipes
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink
              to="/chat"
              class="nav-link"
              exact-active-class="active"
              @click="closeNavbar"
            >
              <i class="bi bi-robot me-1"></i>AI Chat
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink
              to="/community"
              class="nav-link"
              exact-active-class="active"
              @click="closeNavbar"
            >
              <i class="bi bi-people me-1"></i>Community
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink
              to="/leaderboard"
              class="nav-link"
              exact-active-class="active"
              @click="closeNavbar"
            >
              <i class="bi bi-trophy me-1"></i>Leaderboard
            </RouterLink>
          </li>
        </ul>

        <!-- User section -->
        <ul class="navbar-nav ms-auto">
          <li class="nav-item dropdown" v-if="userName">
            <a
              class="nav-link dropdown-toggle"
              href="#"
              role="button"
              @click.prevent="toggleDropdown"
              :class="{ show: dropdownOpen }"
              aria-haspopup="true"
              :aria-expanded="dropdownOpen.toString()"
            >
              <span class="initials-avatar">{{ userInitials }}</span>{{ userName }}
            </a>
            <ul class="dropdown-menu dropdown-menu-end" :class="{ show: dropdownOpen }">
              <li>
                <RouterLink to="/profile" class="dropdown-item" @click="closeNavbar">
                  <i class="bi bi-person me-2"></i>My Profile
                </RouterLink>
              </li>
              <li>
                <a class="dropdown-item text-danger" href="#" @click.prevent="logout">
                  <i class="bi bi-box-arrow-right me-2"></i>Logout
                </a>
              </li>
            </ul>
          </li>
          <li class="nav-item" v-else>
            <RouterLink to="/login" class="nav-link" exact-active-class="active" @click="closeNavbar">
              <i class="bi bi-person-plus me-1"></i>Login/Sign Up
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onUnmounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { getAuth, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'

const $route = useRoute()
const router = useRouter()

const dropdownOpen = ref(false)
const navbarOpen = ref(false)

// Auth and user state
const auth = getAuth()
const user = ref(auth.currentUser)
const userName = ref('')

let unsubscribeAuth = null

// Register auth listener once and clean up on unmount
function authListener() {
  unsubscribeAuth = auth.onAuthStateChanged(async (u) => {
    user.value = u
    userName.value = ''
    if (u) {
      try {
        const userDocRef = doc(db, 'user', u.uid) // Corrected collection name to 'users'
        const userDocSnap = await getDoc(userDocRef)
        if (userDocSnap.exists()) {
          userName.value = userDocSnap.data().name
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error)
      }
    }
  })
}
authListener()

onUnmounted(() => {
  if (unsubscribeAuth) unsubscribeAuth()
})

// Close navbar and dropdown on route change
watch($route, () => {
  closeNavbar()
})

function toggleNavbar() {
  navbarOpen.value = !navbarOpen.value
}
function closeNavbar() {
  navbarOpen.value = false
  dropdownOpen.value = false
}
function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
}
async function logout() {
  try {
    await signOut(auth)
    localStorage.removeItem('user')
    sessionStorage.removeItem('user')
    window.dispatchEvent(new Event('userChange'))
    router.push('/login')
  } catch (error) {
    console.error('Logout error:', error)
    alert('Error logging out: ' + error.message)
  }
}
const userInitials = computed(() => {
  if (!userName.value) return 'U'
  const parts = userName.value.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  } else if (parts[0]) {
    return parts[0][0].toUpperCase()
  }
  return 'U'
})
</script>

<style scoped>
/* Navbar layout reset */
.navbar {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

/* Custom active link styling */
.nav-link.active {
  color: #0d6efd !important;
  background-color: #e7f1ff;
  border-radius: 0.375rem;
}

/* Dropdown styling */
.dropdown-menu {
  border: 1px solid #dee2e6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  right: 0;
  left: auto;
  min-width: 200px;
  transform: translateX(0);
}

.dropdown-menu.dropdown-menu-end {
  right: 0 !important;
  left: auto !important;
}

/* Ensure navbar stays on top */
.sticky-top {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.navbar-brand {
  font-size: 1.35rem;
}

.nav-link {
  font-size: 1.12rem;
}

.initials-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #0d6efd;
  color: #fff;
  font-weight: 700;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  font-size: 1.1rem;
  margin-right: 0.5rem;
  vertical-align: middle;
  line-height: 1; /* Improved vertical alignment */
  user-select: none;
}
</style>
