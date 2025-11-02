<template>
  <div class="empty-state-container text-center py-3">
    <div class="icon-wrapper mb-3">
      <i :class="icon" class="empty-icon text-muted"></i>
    </div>
    <h5 class="fw-semibold mb-2 text-secondary">{{ title }}</h5>
    <p class="text-muted mb-0" style="max-width: 400px; margin: 0 auto;">{{ message }}</p>
  </div>
</template>

<script setup>
defineProps({
  icon: {
    type: String,
    default: 'bi-search'
  },
  title: {
    type: String,
    default: 'No results'
  },
  message: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.empty-state-container {
  animation: fadeIn 0.5s ease;
}

.icon-wrapper {
  display: inline-block;
  animation: float 3s ease-in-out infinite;
}

.empty-icon {
  font-size: 3.5rem;
  opacity: 0.5;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
</style>
