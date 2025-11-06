<template>
  <nav v-if="totalPages > 1" class="d-flex justify-content-center align-items-center gap-2 mt-4" aria-label="Recipe pagination">
    <button
      @click="$emit('update:currentPage', currentPage - 1)"
      :disabled="currentPage === 1"
      class="btn btn-sm btn-outline-success rounded-circle d-flex align-items-center justify-content-center"
      style="width: 36px; height: 36px;"
      aria-label="Previous page"
    >
      <i class="bi bi-chevron-left"></i>
    </button>

    <div class="d-flex gap-1">
      <button
        v-for="page in visiblePages"
        :key="page"
        @click="page !== '...' && $emit('update:currentPage', page)"
        :class="page === currentPage ? 'btn-success text-white' : 'btn-outline-secondary'"
        :disabled="page === '...'"
        class="btn btn-sm rounded-circle d-flex align-items-center justify-content-center"
        style="width: 36px; height: 36px; min-width: 36px;"
      >
        {{ page }}
      </button>
    </div>

    <button
      @click="$emit('update:currentPage', currentPage + 1)"
      :disabled="currentPage === totalPages"
      class="btn btn-sm btn-outline-success rounded-circle d-flex align-items-center justify-content-center"
      style="width: 36px; height: 36px;"
      aria-label="Next page"
    >
      <i class="bi bi-chevron-right"></i>
    </button>

    <span class="text-muted small ms-2">
      Page {{ currentPage }} of {{ totalPages }}
    </span>
  </nav>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentPage: {
    type: Number,
    required: true
  },
  totalPages: {
    type: Number,
    required: true
  }
})

defineEmits(['update:currentPage'])

const visiblePages = computed(() => {
  const pages = []
  const delta = 1

  if (props.totalPages <= 7) {

    for (let i = 1; i <= props.totalPages; i++) {
      pages.push(i)
    }
  } else {
    pages.push(1)

    let start = Math.max(2, props.currentPage - delta)
    let end = Math.min(props.totalPages - 1, props.currentPage + delta)

    if (start > 2) {
      pages.push('...')
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (end < props.totalPages - 1) {
      pages.push('...')
    }

    pages.push(props.totalPages)
  }

  return pages
})
</script>

<style scoped>
.btn {
  transition: all 0.2s ease;
  border-width: 1.5px;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(5, 150, 105, 0.15);
}

.btn-outline-success:hover:not(:disabled) {
  background-color: #059669;
  border-color: #059669;
  color: white;
}

.btn-outline-secondary:hover:not(:disabled) {
  background-color: #6c757d;
  border-color: #6c757d;
  color: white;
}

.btn-success {
  background-color: #059669;
  border-color: #059669;
  box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
}
</style>
