<template>
  <div id="app">
    <div v-if="authLoading" class="auth-loading">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
    <template v-else>
      <navbar v-if="showNavbar" />
      <router-view />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { auth } from '@/firebase'
import navbar from '@/components/navbar/navbar.vue'

const route = useRoute()
const authLoading = ref(true)

// Show navbar on all routes except login/signup/landing
const showNavbar = computed(() => {
  return route.path !== '/login' && route.path !== '/signup' && route.path !== '/'
})

onMounted(() => {
  // Wait for auth to initialize
  const unsubscribe = auth.onAuthStateChanged(user => {
    authLoading.value = false
    if (user) {
      console.log('User authenticated:', user.uid)
    } else {
      console.log('No user authenticated')
    }
    unsubscribe()
  })
})
</script>

<style>
#app {
  min-height: 100vh;
}

.auth-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%);
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(5, 150, 105, 0.2);
  border-top-color: #059669;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.auth-loading p {
  margin-top: 1rem;
  color: #059669;
  font-weight: 600;
}
</style>
