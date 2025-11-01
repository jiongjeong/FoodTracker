<script setup>
import { defineProps, defineEmits, defineModel, computed } from 'vue'
import RecipeCard from './RecipeCard.vue'

const searchFilter = defineModel('searchFilter', { type: String, default: '' })

const props = defineProps({
  recipes: {
    type: Array,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  badgeVariant: {
    type: String,
    default: 'primary'
  },
  isBookmarkedFn: {
    type: Function,
    required: true
  },
  countIngredientsFn: {
    type: Function,
    required: true
  },
  showFilter: {
    type: Boolean,
    default: false
  },
  showTimeEstimate: {
    type: Boolean,
    default: false
  },
  showSuggestedBy: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['view-recipe', 'toggle-bookmark'])

const filteredRecipes = computed(() => {
  if (!props.showFilter || !searchFilter.value) return props.recipes
  
  const q = searchFilter.value.toLowerCase().trim()
  return props.recipes.filter(r => {
    return (
      (r.name || '').toLowerCase().includes(q) ||
      (r.category || '').toLowerCase().includes(q) ||
      (r.area || '').toLowerCase().includes(q) ||
      (r.ingredients || []).some(i => i.toLowerCase().includes(q))
    )
  })
})
</script>

<template>
  <div>
    <div class="d-flex align-items-center mb-3">
      <h4 class="fw-bold mb-0">{{ title }}</h4>
      <span 
        class="badge mx-2 rounded-pill"
        :class="`bg-${badgeVariant}`"
      >
        <template v-if="showFilter">
          {{ filteredRecipes.length }} / {{ recipes.length }} recipes
        </template>
        <template v-else>
          {{ recipes.length }} {{ recipes.length === 1 ? 'recipe' : 'recipes' }}
        </template>
      </span>

      <!-- Client-side filter input -->
      <div 
        v-if="showFilter" 
        class="ms-auto d-flex align-items-center" 
        style="max-width: 280px; width: 100%;"
      >
        <input
          v-model="searchFilter"
          type="search"
          class="form-control form-control-sm rounded-3"
          placeholder="Filter results..."
          aria-label="Filter search results"
        />
      </div>
    </div>

    <div class="row g-3">
      <div 
        v-for="recipe in filteredRecipes" 
        :key="recipe.id" 
        class="col-12 col-md-6 col-lg-4"
      >
        <RecipeCard
          :recipe="recipe"
          :is-bookmarked="isBookmarkedFn(recipe.id)"
          :user-ingredient-count="countIngredientsFn(recipe)"
          :show-time-estimate="showTimeEstimate"
          :show-suggested-by="showSuggestedBy"
          @view="emit('view-recipe', recipe)"
          @toggle-bookmark="emit('toggle-bookmark', recipe)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Focus ring for filter input */
input.form-control:focus,
input.form-control:focus-visible {
  outline: none;
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: inset 0 0 0 3px rgba(59, 130, 246, 0.12);
}
</style>
