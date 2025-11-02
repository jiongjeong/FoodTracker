<script setup>
import { defineProps } from 'vue'

const props = defineProps({
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
    default: 'Try a different search'
  }
})
</script>

<template>
  <div class="text-center py-5">
    <i :class="`bi ${icon} display-1 text-muted opacity-25`"></i>
    <h5 class="mt-3">{{ title }}</h5>
    <p class="text-muted mb-0">{{ message }}</p>
  </div>
</template>
