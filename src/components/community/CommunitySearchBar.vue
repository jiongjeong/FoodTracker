<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const searchQuery = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>

<template>
  <div class="container-fluid px-3 px-md-4 mb-4">
    <div class="search-bar-container">
      <div class="input-group shadow-sm" style="border-radius: 50px; overflow: hidden; background: white;">
        <span class="input-group-text border-0 bg-white ps-4">
          <i class="bi bi-search text-muted"></i>
        </span>
        <input
          v-model="searchQuery"
          type="text"
          class="form-control border-0"
          placeholder="Search for items or locations..."
          style="padding: 15px 10px;"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-bar-container {
  max-width: 100%;
}
</style>
