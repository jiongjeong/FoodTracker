<template>
  <div class="text-center py-5">
    <div class="spinner-wrapper position-relative d-inline-block">
      <div class="spinner-border text-success" style="width: 3rem; height: 3rem;">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div class="pulse-ring"></div>
    </div>
    <p class="text-muted mt-3 fw-semibold animated-text">{{ message }}</p>
  </div>
</template>

<script setup>
defineProps({
  message: {
    type: String,
    default: 'Finding delicious recipes...'
  }
})
</script>

<style scoped>
.spinner-wrapper {
  position: relative;
}

.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 3.5rem;
  height: 3.5rem;
  border: 3px solid #059669;
  border-radius: 50%;
  animation: pulseRing 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  opacity: 0;
}

@keyframes pulseRing {
  0% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.8);
    opacity: 0;
  }
}

.animated-text {
  animation: fadeInOut 2s ease-in-out infinite;
}

@keyframes fadeInOut {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}
</style>
