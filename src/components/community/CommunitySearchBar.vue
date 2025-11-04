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
    <div class="input-group rounded-pill shadow-sm search-input-group">
      <span class="input-group-text border-0 bg-white ps-4 search-icon">
        <i class="bi bi-search text-muted"></i>
      </span>
      <input
        v-model="searchQuery"
        type="text"
        class="form-control border-0 py-3"
        placeholder="Search for items or locations..."
      />
    </div>
  </div>
</template>

<style scoped>
.search-input-group {
  border: 2px solid transparent;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
}

.search-input-group:focus-within {
  border-color: #059669;
  box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
}

.search-input-group:focus-within .search-icon i {
  color: #059669;
}

.search-input-group .input-group-text {
  border-radius: 50px 0 0 50px;
}

.search-input-group .form-control {
  border-radius: 0 50px 50px 0;
}
</style>
