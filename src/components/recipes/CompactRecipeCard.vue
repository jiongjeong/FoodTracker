<template>
  <div class="recipe-card rounded-3 shadow-sm overflow-hidden h-100 bg-white border">
    <!-- Recipe Image -->
    <div
      class="recipe-image-container position-relative overflow-hidden"
      @click.stop="$emit('view', recipe)"
    >
      <img :src="recipe.image" :alt="recipe.name" class="recipe-img" />
      
      <!-- Bookmark Button -->
      <button
        @click.stop="$emit('toggle-bookmark', recipe)"
        class="bookmark-btn"
        :class="{ bookmarked: isBookmarked }">
        <i :class="isBookmarked ? 'bi-heart-fill' : 'bi-heart'"></i>
      </button>

      <!-- Category Badge -->
      <span class="category-badge badge position-absolute bottom-0 start-0 m-2 px-2 py-1 bg-white bg-opacity-95 text-dark">
        {{ recipe.category }}
      </span>
    </div>

    <!-- Recipe Info -->
      <div class="p-2 cursor-pointer" @click="$emit('view', recipe)">
      <h6 class="recipe-title fw-bold mb-2 text-dark" style="font-size: 1.06rem;">
        {{ recipe.name }}
      </h6>
      
      <div class="d-flex align-items-center gap-2 text-muted mb-2 small">
        <span v-if="recipe.area" class="d-flex align-items-center gap-1">
          <i class="bi bi-geo-alt-fill"></i>
          <span>{{ recipe.area }}</span>
        </span>
        <span v-if="showTimeEstimate" class="d-flex align-items-center gap-1">
          <i class="bi bi-clock-fill"></i>
          <span>{{ estimatedTime }}</span>
        </span>
      </div>

      <!-- User Ingredient Match -->
      <div v-if="userIngredientCount > 0" class="d-flex align-items-center gap-1 mb-2">
        <span class="badge bg-success bg-opacity-10 text-success px-2 py-1 fw-semibold" style="font-size: 0.75rem;">
          <i class="bi bi-check-circle-fill me-1"></i>{{ userIngredientCount }} ingredients you have
        </span>
      </div>

      <!-- Suggested By -->
      <div v-if="showSuggestedBy && recipe.suggestedBy?.length" class="mt-2">
        <p class="mb-1 text-muted fw-semibold" style="font-size: 0.75rem;">Suggested by:</p>
        <div class="d-flex flex-wrap gap-1">
          <span
            v-for="food in recipe.suggestedBy.slice(0, 3)"
            :key="food"
            class="badge bg-warning bg-opacity-10 text-warning px-2 py-1"
            style="font-size: 0.7rem;">
            {{ food }}
          </span>
          <span v-if="recipe.suggestedBy.length > 3" class="badge bg-secondary bg-opacity-10 text-secondary px-2 py-1" style="font-size: 0.7rem;">
            +{{ recipe.suggestedBy.length - 3 }} more
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

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

defineEmits(['view', 'toggle-bookmark'])

const estimatedTime = computed(() => {
  const count = props.recipe.ingredients?.length || 0
  if (count < 5) return '15-20 min'
  if (count < 10) return '25-35 min'
  if (count < 15) return '40-50 min'
  return '50+ min'
})
</script>

<style scoped>
.recipe-card {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: cardFadeIn 0.5s ease-out;
}

.recipe-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.recipe-image-container {
  position: relative;
  width: 100%;
  padding-bottom: 100%;
  overflow: hidden;
  cursor: pointer;
  box-sizing: border-box;
}

.recipe-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.recipe-card:hover .recipe-img {
  transform: scale(1.1);
}

.recipe-image-container::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.3), transparent);
  pointer-events: none;
  z-index: 1;
}

.category-badge {
  font-size: 0.7rem;
  backdrop-filter: blur(8px);
  z-index: 2;
}

.recipe-title {
  font-size: 0.9rem;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cursor-pointer {
  cursor: pointer;
}

.bookmark-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6c757d;
  transition: all 0.2s ease;
  z-index: 2;
  font-size: 1rem;
}

.bookmark-btn:hover {
  background: #fff;
  transform: rotate(12deg) scale(1.1);
}

.bookmark-btn.bookmarked {
  background: #fff;
  color: #dc3545;
}

@media (min-width: 768px) {
  .recipe-title {
    font-size: 1rem;
    line-height: 1.4;
  }

  .bookmark-btn {
    width: 36px;
    height: 36px;
    font-size: 1.1rem;
    top: 0.625rem;
    right: 0.625rem;
  }
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
