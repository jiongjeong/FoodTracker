<template>
  <div id="app">
    <div v-if="authLoading" class="auth-loading">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
    <template v-else>
      <navbar v-if="showNavbar" />
      <div class="main-content" :class="{ 'with-navbar': showNavbar }">
          <transition name="fade">
            <!-- Wrap router-view in a single element so Transition can animate an element root.
                 This avoids the Vue warning when a routed component renders a fragment/multiple roots. -->
            <div :key="route.path" class="route-wrapper">
              <router-view />
            </div>
          </transition>
      </div>
    </template>

    <!-- Custom Alert Box -->
    <CustomAlert
      v-model:show="alertState.show"
      :type="alertState.type"
      :title="alertState.title"
      :message="alertState.message"
      :confirm-text="alertState.confirmText"
      :cancel-text="alertState.cancelText"
      :show-cancel="alertState.showCancel"
      :close-on-overlay-click="alertState.closeOnOverlayClick"
      @confirm="alertState.onConfirm"
      @cancel="alertState.onCancel"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { auth } from '@/firebase'
import navbar from '@/components/navbar/navbar.vue'
import CustomAlert from '@/components/CustomAlert.vue'
import { useAlert } from '@/composables/useAlert'

const route = useRoute()
const authLoading = ref(true)
const { alertState } = useAlert()

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

.main-content.with-navbar {
  padding-top: 56px;
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

/* Page transitions for route changes (used when clicking navbar links) */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

/* optional slide transition if you set meta.transition = 'slide' on a route */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.36s ease;
}
.slide-enter-from {
  opacity: 0;
  transform: translateX(26px);
}
.slide-leave-to {
  opacity: 0;
  transform: translateX(-26px);
}
.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  transform: translateX(0);
}
</style>
