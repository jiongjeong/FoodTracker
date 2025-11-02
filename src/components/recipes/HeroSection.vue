<script setup>
import { defineProps, defineEmits, defineModel } from 'vue'

const searchQuery = defineModel('searchQuery', { type: String, default: '' })

const props = defineProps({
  activeTab: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['search', 'tab-change'])
</script>

<template>
  <div class="hero-card position-relative p-4 p-md-5 mb-4 overflow-hidden">
    <p class="lead text-green-muted mb-0">
      Discover fresh recipes to cut waste and boost flavor 🌿
    </p>

    <div class="mb-4">
      <h1 class="display-6 fw-bold mb-2">Feeling hungry?</h1>
      <h2 class="h3 text-muted">What are we cookin' today?</h2>
    </div>

    <!-- Search Bar -->
    <div class="mb-4">
      <div class="input-group shadow-sm rounded-pill overflow-hidden bg-white">
        <span class="input-group-text border-0 bg-white ps-4">
          <i class="bi bi-search text-muted"></i>
        </span>
        <input
          v-model="searchQuery"
          type="text"
          class="form-control border-0 search-input"
          placeholder="Search any recipe..."
          @keyup.enter="emit('search')"
          style="padding: 15px 10px;"
        />
        <button class="btn border-0 bg-white pe-4">
          <i class="bi bi-sliders text-muted fs-5"></i>
        </button>
      </div>
    </div>

    <!-- Category Pills -->
    <div class="category-pills d-flex gap-2 overflow-auto pb-2 mb-3">
      <button
        @click="emit('tab-change', 'search')"
        class="btn rounded-pill flex-shrink-0 px-4 py-2"
        :class="activeTab === 'search' ? 'btn-success text-white shadow-active' : 'btn-light shadow-soft'"
      >
        See All
      </button>

      <button
        @click="emit('tab-change', 'suggested')"
        class="btn rounded-pill flex-shrink-0 px-4 py-2"
        :class="activeTab === 'suggested' ? 'btn-success text-white shadow-active' : 'btn-light shadow-soft'"
      >
        <span class="me-2">💡</span>
        Recommended
      </button>

      <button
        @click="emit('tab-change', 'bookmarked')"
        class="btn rounded-pill flex-shrink-0 px-4 py-2"
        :class="activeTab === 'bookmarked' ? 'btn-success text-white shadow-active' : 'btn-light shadow-soft'"
      >
        <span class="me-2">❤️</span>
        Bookmarked
      </button>
    </div>
  </div>
</template>

<style scoped>
.category-pills {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.category-pills::-webkit-scrollbar {
  display: none;
}

.shadow-soft {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease-in-out;
}

.shadow-active {
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3), 0 0 4px rgba(34, 197, 94, 0.4);
  transition: all 0.25s ease-in-out;
}

.category-pills .btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Focus ring: avoid being clipped by parent overflow by using an inset ring */
.search-input:focus,
.search-input:focus-visible {
  outline: none;
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: inset 0 0 0 3px rgba(59, 130, 246, 0.12);
}
</style>
