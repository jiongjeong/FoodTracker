<script setup>
const props = defineProps({
  type: {
    type: String,
    default: 'no-items', // 'no-items', 'no-active', 'no-available'
    validator: (value) => ['no-items', 'no-active', 'no-available'].includes(value)
  }
})


const config = {
  'no-items': {
    icon: 'bi-inbox',
    title: 'No items shared yet',
    message: 'Start sharing food to help your community',
    buttonText: 'Share Your First Item',
    showButton: true
  },
  'no-active': {
    icon: 'bi-check-circle',
    title: 'All items donated!',
    message: 'Click "Show Donated" to see history',
    showButton: false
  },
  'no-available': {
    icon: 'bi-basket',
    title: 'No items available',
    message: 'Check back later for food donations',
    showButton: false
  }
}

const currentConfig = config[props.type]
</script>

<template>
  <div class="empty-state-card text-center py-5">
    <i :class="`bi ${currentConfig.icon} display-1 text-muted opacity-50`"></i>
    <h5 class="mt-3">{{ currentConfig.title }}</h5>
    <p class="text-muted">{{ currentConfig.message }}</p>
    <button v-if="currentConfig.showButton" class="btn btn-primary mt-3" @click="$emit('share-food')">
      <i class="bi bi-plus-lg me-2"></i>
      {{ currentConfig.buttonText }}
    </button>
  </div>
</template>

<style scoped>
.empty-state-card {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
</style>
