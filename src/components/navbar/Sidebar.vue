<template>
  <div class="sidebar" :class="{ 'show': sidebarOpen }">
    <div class="p-4">
      <nav class="d-flex flex-column gap-1 mb-4">
        <RouterLink to="/dashboard" class="nav-link" :class="{ active: $route.path === '/dashboard' }">
          <i class="bi bi-house-door"></i>
          <span>Dashboard</span>
        </RouterLink>
        <RouterLink to="/recipes" class="nav-link" :class="{ active: $route.path === '/recipes' }">
          <i class="bi bi-egg-fried"></i>
          <span>Recipes</span>
        </RouterLink>
        <RouterLink to="/chat" class="nav-link" :class="{ active: $route.path === '/chat' }">
          <i class="bi bi-robot"></i>
          <span>AI Chat</span>
        </RouterLink>
        <RouterLink to="/community" class="nav-link" :class="{ active: $route.path === '/community' }">
          <i class="bi bi-people"></i>
          <span>Community</span>
        </RouterLink>
        <RouterLink to="/analytics" class="nav-link" :class="{ active: $route.path === '/analytics' }">
          <i class="bi bi-bar-chart"></i>
          <span>Analytics</span>
        </RouterLink>
        <RouterLink to="/leaderboard" class="nav-link" :class="{ active: $route.path === '/leaderboard' }">
          <i class="bi bi-trophy"></i>
          <span>Leaderboard</span>
        </RouterLink>
        <div v-if="user" class="nav-link mt-4 position-relative">
          <div
            @click="toggleDropdown"
            class="user-dropdown-toggle d-flex align-items-center gap-2"
            tabindex="0"
            @keydown.enter.prevent="toggleDropdown"
            style="cursor:pointer;"
            aria-haspopup="true"
            :aria-expanded="dropdownOpen.toString()"
          >
            <i class="bi bi-person-circle"></i>
            <span>{{ user.name }}</span>
            <i class="bi" :class="dropdownOpen ? 'bi-caret-up-fill' : 'bi-caret-down-fill'"></i>
          </div>
          <div v-if="dropdownOpen" class="user-dropdown-menu" role="menu" tabindex="-1">
            <div
              @click="logout"
              class="logout-btn"
              tabindex="0"
              role="menuitem"
              @keydown.enter.prevent="logout"
            >
              Logout
            </div>
          </div>
        </div>
        <RouterLink v-else to="/signup" class="nav-link mt-4" :class="{ active: $route.path === '/signup' }">
          <i class="bi bi-person-plus"></i>
          <span>Login/Sign Up</span>
        </RouterLink>
      </nav>
    </div>
  </div>
</template>

<script setup>
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ref, onMounted, onUnmounted } from 'vue'

const $route = useRoute()
const router = useRouter()

const user = ref(null)
const dropdownOpen = ref(false)

// Sync user from localStorage reactively on mount and custom event
function syncUser() {
  const userJSON = localStorage.getItem('user')
  user.value = userJSON ? JSON.parse(userJSON) : null
  if (!user.value) dropdownOpen.value = false
}

onMounted(() => {
  syncUser()
  window.addEventListener("userChange", syncUser)
})

onUnmounted(() => {
  window.removeEventListener("userChange", syncUser)
})

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
}

function logout() {
  localStorage.removeItem('user')
  window.dispatchEvent(new Event("userChange"))
  dropdownOpen.value = false
  router.push('/login')
}
</script>

<style scoped>
.user-dropdown-menu {
  background: #f9f9f9;
  border-radius: 0.25rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  min-width: 110px;
  position: absolute;
  left: 0;
  top: 100%;
  z-index: 10;
  padding: 0.5rem 0.25rem;
}
.logout-btn {
  color: #059669;
  cursor: pointer;
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  transition: background 0.2s;
  user-select: none;
  text-align: left;
}
.logout-btn:hover, .logout-btn:focus {
  background: #e6f4ef;
}
.user-dropdown-toggle {
  border-radius: 0.25rem;
  padding: 0.5rem 0;
  user-select: none;
}
.user-dropdown-toggle:hover,
.user-dropdown-toggle:focus {
  background: #f3f4f6;
  outline: none;
}
.position-relative {
  position: relative;
}
</style>
