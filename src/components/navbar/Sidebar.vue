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
      </nav>
    </div>
  </div>
</template>

<script setup>
import { RouterLink, useRoute } from 'vue-router'
const $route = useRoute()
</script>