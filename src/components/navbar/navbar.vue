<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-white border-bottom sticky-top">
    <div class="container-fluid d-flex justify-content-between align-items-center">
      <!-- Brand -->
      <RouterLink
        to="/dashboard"
        class="navbar-brand fw-bold text-primary p-2 text-decoration-none"
        :class="{ active: $route.path === '/dashboard' }"
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
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <!-- Collapsible navbar content -->
      <div class="collapse navbar-collapse flex-grow-1" id="navbarNav" :class="{ show: navbarOpen }">
        <ul class="navbar-nav mx-auto">
          <li class="nav-item">
            <RouterLink to="/dashboard" class="nav-link" :class="{ active: $route.path === '/dashboard' }" @click="closeNavbar">
              <i class="bi bi-house-door me-1"></i>Dashboard
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink to="/recipes" class="nav-link" :class="{ active: $route.path === '/recipes' }" @click="closeNavbar">
              <i class="bi bi-egg-fried me-1"></i>Recipes
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink to="/chat" class="nav-link" :class="{ active: $route.path === '/chat' }" @click="closeNavbar">
              <i class="bi bi-robot me-1"></i>AI Chat
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink to="/community" class="nav-link" :class="{ active: $route.path === '/community' }" @click="closeNavbar">
              <i class="bi bi-people me-1"></i>Community
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink to="/analytics" class="nav-link" :class="{ active: $route.path === '/analytics' }" @click="closeNavbar">
              <i class="bi bi-bar-chart me-1"></i>Analytics
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink to="/leaderboard" class="nav-link" :class="{ active: $route.path === '/leaderboard' }" @click="closeNavbar">
              <i class="bi bi-trophy me-1"></i>Leaderboard
            </RouterLink>
          </li>
        </ul>

        <!-- User section -->
        <ul class="navbar-nav ms-auto">
          <li class="nav-item dropdown" v-if="user">
            <a
              class="nav-link dropdown-toggle"
              href="#"
              role="button"
              @click.prevent="toggleDropdown"
              :class="{ show: dropdownOpen }"
            >
              <i class="bi bi-person-circle me-1"></i>{{ user.name }}
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
            <RouterLink to="/login" class="nav-link" :class="{ active: $route.path === '/login' }" @click="closeNavbar">
              <i class="bi bi-person-plus me-1"></i>Login/Sign Up
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ref, onMounted, onUnmounted } from 'vue'

const $route = useRoute()
const router = useRouter()

const user = ref(null)
const dropdownOpen = ref(false)
const navbarOpen = ref(false)

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

// Centralized logout logic in navbar

function logout() {
  localStorage.removeItem('user')
  window.dispatchEvent(new Event("userChange"))
  dropdownOpen.value = false
  navbarOpen.value = false
  router.push('/login')
}
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
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
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
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.navbar-brand {
  font-size: 1.35rem;
}
.nav-link {
  font-size: 1.12rem;
}
</style>
