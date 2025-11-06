<template>
  <div id="app">
    <div v-if="authLoading" class="auth-loading">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
    <template v-else>
      <navbar v-if="showNavbar" />
      <div class="main-content" :class="{ 'with-navbar': showNavbar }">
        <transition name="fade" mode="out-in">
          <div :key="route.path" class="route-wrapper">
            <router-view />
          </div>
        </transition>
      </div>
    </template>

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
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { auth } from '@/firebase'
import navbar from '@/components/navbar/navbar.vue'
import CustomAlert from '@/components/CustomAlert.vue'
import { useAlert } from '@/composables/useAlert'

const route = useRoute()
const authLoading = ref(true)
const { alertState } = useAlert()

const showNavbar = computed(() => {
  const excludedRoutes = ['/', '/login', '/signup']
  return !excludedRoutes.includes(route.path)
})

// Disable browser scroll restoration
if (history.scrollRestoration) {
  history.scrollRestoration = 'manual'
}

// Scroll to top on route change
watch(() => route.path, () => {
  window.scrollTo(0, 0)
})

onMounted(() => {
  const unsubscribe = auth.onAuthStateChanged(user => {
    authLoading.value = false
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
