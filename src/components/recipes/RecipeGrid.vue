<template>
  <div>
  <!-- Section Header with Search -->
  <div v-if="showTitle || showFilter" class="section-header d-flex justify-content-between align-items-center gap-3 mb-4 flex-wrap">
      <div class="d-flex align-items-center gap-2">
        <h4 class="fw-bold mb-0 h5 text-dark">
          {{ title }} 
          <span class="badge ms-2" style="background-color: rgba(25, 135, 84, 0.2); color: #198754;">{{ totalRecipes }}</span>
        </h4>
        <!-- Show filtered count if filtering is active -->
        <small v-if="showFilter && searchFilter && totalRecipes < recipes.length" class="text-muted ms-2">
          (showing {{ totalRecipes }} of {{ recipes.length }})
        </small>
      </div>

      <!-- Search Filter -->
      <div v-if="showFilter" class="search-filter-container">
        <div class="input-group input-group-sm shadow-sm">
          <span class="input-group-text bg-white">
            <i class="bi bi-search text-success"></i>
          </span>
          <input
            :value="searchFilter"
            @input="updateFilter($event.target.value)"
            type="text"
            class="form-control"
            placeholder="Filter results"
          />
          <button
            v-if="searchFilter"
            @click="updateFilter('')"
            class="btn btn-outline-secondary"
            type="button"
            title="Clear search"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Recipe Grid -->
    <div class="recipe-grid">
      <div
        v-for="recipe in paginatedRecipes"
        :key="recipe.id"
        class="recipe-grid-item"
      >
        <RecipeCard
          :recipe="recipe"
          :is-bookmarked="isBookmarkedFn(recipe.id)"
          :user-ingredient-count="countIngredientsFn(recipe)"
          :show-suggested-by="showSuggestedBy"
          :show-time-estimate="showTimeEstimate"
          @view="$emit('view-recipe', $event)"
          @toggle-bookmark="$emit('toggle-bookmark', $event)"
        />
      </div>
    </div>

    <!-- Pagination -->
    <RecipePagination
      v-model:current-page="currentPage"
      :total-pages="totalPages"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch, defineProps } from 'vue'
import RecipeCard from './RecipeCard.vue'
import RecipePagination from './RecipePagination.vue'

const props = defineProps({
  recipes: {
    type: Array,
    required: true
  },
  title: {
    type: String,
    required: false,
    default: ''
  },
  showTitle: {
    type: Boolean,
    default: true
  },
  showFilter: {
    type: Boolean,
    default: false
  },
  searchFilter: {
    type: String,
    default: ''
  },
  showSuggestedBy: {
    type: Boolean,
    default: false
  },
  showTimeEstimate: {
    type: Boolean,
    default: false
  },
  isBookmarkedFn: {
    type: Function,
    required: true
  },
  countIngredientsFn: {
    type: Function,
    required: true
  },
  itemsPerPage: {
    type: Number,
    default: 10
  }
})

const emit = defineEmits(['view-recipe', 'toggle-bookmark', 'update:searchFilter'])

const currentPage = ref(1)

const filteredRecipes = computed(() => {
  if (!props.showFilter || !props.searchFilter) return props.recipes
  
  const search = props.searchFilter.toLowerCase().trim()
  return props.recipes.filter(r => 
    r.name?.toLowerCase().includes(search) ||
    r.category?.toLowerCase().includes(search) ||
    r.area?.toLowerCase().includes(search) ||
    (r.ingredients || []).some(i => i.toLowerCase().includes(search))
  )
})

const totalRecipes = computed(() => filteredRecipes.value.length)

const totalPages = computed(() => 
  Math.ceil(filteredRecipes.value.length / props.itemsPerPage)
)

const paginatedRecipes = computed(() => {
  const start = (currentPage.value - 1) * props.itemsPerPage
  const end = start + props.itemsPerPage
  return filteredRecipes.value.slice(start, end)
})

// Reset to page 1 when filter changes
watch(() => props.searchFilter, () => {
  currentPage.value = 1
})

const updateFilter = (value) => {
  emit('update:searchFilter', value)
}
</script>

<style scoped>
.section-header {
  animation: fadeInDown 0.5s ease;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.search-filter-container {
  width: 100%;
  max-width: 320px;
}

.input-group {
  border-radius: 0.375rem;
  overflow: hidden;
}

.input-group-text {
  border-color: #e5e7eb;
  padding: 0.5rem 0.75rem;
  transition: all 0.2s ease;
}

.form-control {
  border-color: #e5e7eb;
  transition: all 0.2s ease;
}

.form-control:focus {
  border-color: #059669;
  box-shadow: 0 0 0 0.2rem rgba(5, 150, 105, 0.1);
}

.input-group:focus-within .input-group-text {
  border-color: #059669;
  background-color: rgba(5, 150, 105, 0.05);
}

.btn-outline-secondary {
  transition: all 0.2s ease;
}

.btn-outline-secondary:hover {
  background-color: #6c757d;
  border-color: #6c757d;
  color: white;
}

.recipe-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.recipe-grid-item {
  width: 100%;
}

@media (min-width: 576px) {
  .recipe-grid {
    gap: 1rem;
  }
}

@media (min-width: 768px) {
  .recipe-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
}

@media (min-width: 992px) {
  .recipe-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 1.25rem;
  }
}

@media (min-width: 1200px) {
  .recipe-grid {
    grid-template-columns: repeat(5, 1fr);
    gap: 1.25rem;
  }
}
</style>
