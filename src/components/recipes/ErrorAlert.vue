<template>
  <Transition name="alert-slide">
    <div v-if="message" class="alert alert-danger d-flex align-items-center mb-3 rounded-3 shadow border-0">
      <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
      <span class="flex-grow-1">{{ message }}</span>
      <button type="button" class="btn-close ms-2" @click="$emit('close')" aria-label="Close alert"></button>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  message: {
    type: String,
    default: ''
  }
})

defineEmits(['close'])
</script>

<style scoped>
.alert-slide-enter-active,
.alert-slide-leave-active {
  transition: all 0.3s ease;
}

.alert-slide-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.alert-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
