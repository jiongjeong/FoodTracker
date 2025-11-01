<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  recipe: {
    type: Object,
    required: true
  },
  isBookmarked: {
    type: Boolean,
    default: false
  },
  userIngredientCount: {
    type: Number,
    default: 0
  },
  showSuggestedBy: {
    type: Boolean,
    default: false
  },
  showTimeEstimate: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['view', 'toggle-bookmark'])
</script>

<template>
  <div 
    class="recipe-card position-relative shadow-sm rounded-4 bg-white" 
    style="cursor: pointer; overflow: hidden;"
    @click="emit('view', recipe)"
  >
    <div class="recipe-image-container position-relative" style="height: 250px;">
      <img 
        :src="recipe.image" 
        :alt="recipe.name" 
        class="w-100 h-100" 
        style="object-fit: cover;" 
      />

      <!-- Time estimate badge (for suggested recipes) -->
      <div 
        v-if="showTimeEstimate"
        class="position-absolute top-0 start-0 m-3 px-3 py-2 rounded-pill" 
        style="background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(10px);"
      >
        <span class="text-white small fw-semibold">
          <i class="bi bi-clock me-1"></i>30 mins
        </span>
      </div>

      <!-- Bookmark button -->
      <button
        @click.stop="emit('toggle-bookmark', recipe)"
        class="position-absolute top-0 end-0 m-3 btn btn-light rounded-circle p-0 d-flex align-items-center justify-content-center"
        style="width: 40px; height: 40px; backdrop-filter: blur(10px);"
        :class="{ 'btn-warning': isBookmarked }"
      >
        <i :class="isBookmarked ? 'bi bi-bookmark-heart-fill text-danger' : 'bi bi-bookmark-heart'"></i>
      </button>

      <!-- Gradient overlay -->
      <div class="recipe-image-overlay"></div>
    </div>

    <div class="recipe-info p-3">
      <h6 class="fw-bold mb-2 text-truncate">{{ recipe.name }}</h6>
      <p class="text-muted small mb-2 text-truncate">{{ recipe.category }} • {{ recipe.area }}</p>
      
      <div class="d-flex align-items-center justify-content-between" :class="{ 'mb-2': showSuggestedBy }">
        <span class="badge bg-info text-white px-3 py-2 rounded-pill">
          <i class="bi bi-check-circle me-1"></i>
          {{ userIngredientCount }}/{{ recipe.ingredients?.length || 0 }} ingredients
        </span>
      </div>

      <!-- Expiring foods that suggested this recipe -->
      <div v-if="showSuggestedBy && recipe.suggestedBy?.length" class="mb-0">
        <small class="text-danger">
          <i class="bi bi-lightbulb-fill me-1"></i>
          Expiring: {{ recipe.suggestedBy.slice(0, 2).join(', ') }}
        </small>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recipe-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.recipe-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15) !important;
}

.recipe-image-overlay {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.3), transparent);
  pointer-events: none;
}
</style>
