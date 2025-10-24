
<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { auth } from '../firebase.js'
import { onAuthStateChanged } from 'firebase/auth'
import { useRecipesStore } from '../stores/recipes.js'


// Configuration constants
const API_BASE_URL = 'https://www.themealdb.com/api/json/v1/1'
const MAX_INGREDIENTS = 20
const REQUEST_TIMEOUT = 10000 // 10 seconds
const POPULAR_CATEGORIES = ['Chicken', 'Beef', 'Pasta', 'Seafood', 'Dessert']


// Reactive state
const activeTab = ref('search')
const searchQuery = ref('')
const route = useRoute()
const isLoading = ref(false)
const searchResults = ref([])
const popularRecipes = ref([])
const selectedRecipe = ref(null)
const showRecipeModal = ref(false)
const errorMessage = ref('')
const user = ref(auth.currentUser)

// Pinia store
const recipesStore = useRecipesStore()
const bookmarkedRecipes = computed(() => recipesStore.bookmarkedRecipes)
const isRecipeBookmarked = recipesStore.isRecipeBookmarked
const toggleBookmark = recipesStore.toggleBookmark

// Computed properties
const userId = computed(() => user.value?.uid || null)

const bookmarkedRecipeObjects = ref([])

const displayedRecipes = computed(() => {
  switch (activeTab.value) {
    case 'search':
      return searchResults.value
    case 'popular':
      return popularRecipes.value
    case 'bookmarked':
      return bookmarkedRecipeObjects.value
    default:
      return []
  }
})

// Fetch full recipe objects for bookmarked IDs
const fetchBookmarkedRecipes = async () => {
  const ids = bookmarkedRecipes.value
    .map(r => (typeof r === 'object' ? r.idMeal || r.id : r))
    .filter(Boolean)
  const recipes = []
  for (const id of ids) {
    try {
      const response = await axios.get(`${API_BASE_URL}/lookup.php`, { params: { i: id }, timeout: REQUEST_TIMEOUT })
      if (response.data.meals && response.data.meals[0]) {
        const meal = response.data.meals[0]
        recipes.push({
          id: meal.idMeal,
          name: meal.strMeal,
          image: meal.strMealThumb,
          category: meal.strCategory,
          area: meal.strArea,
          instructions: meal.strInstructions,
          ingredients: getIngredientsList(meal),
          video: meal.strYoutube,
          source: meal.strSource
        })
      }
    } catch (e) {
      // skip failed fetches
    }
  }
  bookmarkedRecipeObjects.value = recipes
}

// Watch for tab change to 'bookmarked' and fetch recipes
watch(activeTab, async (tab) => {
  if (tab === 'bookmarked') {
    await fetchBookmarkedRecipes()
  }
})

// Also refetch when bookmarks change and tab is 'bookmarked'
watch(bookmarkedRecipes, async () => {
  if (activeTab.value === 'bookmarked') {
    await fetchBookmarkedRecipes()
  }
})

// Error handling helper
const handleApiError = (error) => {
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please check your connection and try again.'
  } else if (error.response) {
    return `Server error: ${error.response.status}. Please try again later.`
  } else if (error.request) {
    return 'Network error. Please check your internet connection.'
  } else {
    return error.message || 'An unexpected error occurred. Please try again.'
  }
}

// Search recipes from TheMealDB API
const searchRecipes = async (query) => {
  if (!query.trim()) {
    searchResults.value = []
    errorMessage.value = ''
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  
  try {
    const response = await axios.get(`${API_BASE_URL}/search.php`, {
      params: { s: query },
      timeout: REQUEST_TIMEOUT
    })
    
    if (response.data.meals) {
      searchResults.value = response.data.meals.map(meal => ({
        id: meal.idMeal,
        name: meal.strMeal,
        image: meal.strMealThumb,
        category: meal.strCategory,
        area: meal.strArea,
        instructions: meal.strInstructions,
        ingredients: getIngredientsList(meal),
        video: meal.strYoutube,
        source: meal.strSource
      }))
    } else {
      searchResults.value = []
    }
  } catch (error) {
    console.error('Error searching recipes:', error)
    errorMessage.value = handleApiError(error)
    searchResults.value = []
  } finally {
    isLoading.value = false
  }
}

// Get popular recipes using parallel requests
const getPopularRecipes = async () => {
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    // Create parallel requests for all categories
    const requests = POPULAR_CATEGORIES.map(category => 
      axios.get(`${API_BASE_URL}/search.php`, {
        params: { s: category },
        timeout: REQUEST_TIMEOUT
      })
    )
    
    // Execute all requests in parallel
    const responses = await Promise.all(requests)
    
    // Process responses and extract first recipe from each category
    const recipes = responses
      .map(response => response.data.meals?.[0])
      .filter(meal => meal !== null && meal !== undefined)

    popularRecipes.value = recipes.map(meal => ({
      id: meal.idMeal,
      name: meal.strMeal,
      image: meal.strMealThumb,
      category: meal.strCategory,
      area: meal.strArea,
      instructions: meal.strInstructions,
      ingredients: getIngredientsList(meal),
      video: meal.strYoutube,
      source: meal.strSource
    }))
    
  } catch (error) {
    console.error('Error getting popular recipes:', error)
    errorMessage.value = handleApiError(error)
    popularRecipes.value = []
  } finally {
    isLoading.value = false
  }
}

// Extract ingredients list from TheMealDB response
const getIngredientsList = (meal) => {
  const ingredients = []
  for (let i = 1; i <= MAX_INGREDIENTS; i++) {
    const ingredient = meal[`strIngredient${i}`]
    const measure = meal[`strMeasure${i}`]
    if (ingredient && ingredient.trim()) {
      ingredients.push(`${measure ? measure.trim() + ' ' : ''}${ingredient.trim()}`)
    }
  }
  return ingredients
}

// Handle search
const handleSearch = async () => {
  await searchRecipes(searchQuery.value)
}

// View recipe details
const viewRecipe = (recipe) => {
  selectedRecipe.value = recipe
  showRecipeModal.value = true
}


// Remove local toggleBookmark logic; use store's toggleBookmark


// Remove local loadBookmarkedRecipes; use store's loadBookmarks


// Initialize popular recipes and load bookmarks
const initializeRecipes = async () => {
  await recipesStore.loadBookmarks()
  await getPopularRecipes()
}

// Watch for route query changes to auto-search
watch(
  () => route.query.search,
  async (newSearch) => {
    if (typeof newSearch === 'string' && newSearch.trim()) {
      searchQuery.value = newSearch
      activeTab.value = 'search'
      await searchRecipes(newSearch)
    }
  },
  { immediate: true }
)

// Initialize on component mount
onMounted(() => {
  initializeRecipes()
})

// Auth state change listener
onAuthStateChanged(auth, async (u) => {
  user.value = u
  await recipesStore.loadBookmarks()
})
</script>

<template>
  <div class="container-fluid p-4">
    <div class="mb-4">
      <h1 class="h2 mb-2">Recipe Discovery</h1>
      <p class="text-muted">Search recipes and discover delicious meals</p>
    </div>

    <!-- Search Section -->
    <div class="glass-card p-4 mb-4">
      <!-- Error Message -->
      <div v-if="errorMessage" class="alert alert-danger d-flex align-items-center mb-3">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        <span>{{ errorMessage }}</span>
        <button type="button" class="btn-close ms-auto" @click="errorMessage = ''"></button>
      </div>
      
      <div class="row g-3 align-items-end">
        <div class="col-md-8">
          <label class="form-label">Search for recipes</label>
          <input
            v-model="searchQuery"
            type="text"
            class="form-control"
            placeholder="Enter recipe name, ingredient, or cuisine..."
            @keyup.enter="handleSearch"
          />
        </div>
        <div class="col-md-4">
          <button @click="handleSearch" class="btn btn-primary w-100" :disabled="isLoading">
            <i class="bi bi-search me-2"></i>
            {{ isLoading ? 'Searching...' : 'Search Recipes' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="glass-card p-4 mb-4">
      <ul class="nav nav-tabs border-0 mb-4">
        <li class="nav-item">
          <button
            class="nav-link"
            :class="{ active: activeTab === 'search' }"
            @click="activeTab = 'search'"
          >
            <i class="bi bi-search me-2"></i>
            Search Results
            <span v-if="searchResults.length" class="badge bg-primary ms-2">{{ searchResults.length }}</span>
          </button>
        </li>
        <li class="nav-item">
          <button
            class="nav-link"
            :class="{ active: activeTab === 'popular' }"
            @click="activeTab = 'popular'"
          >
            <i class="bi bi-star me-2"></i>
            Popular Recipes
            <span v-if="popularRecipes.length" class="badge bg-success ms-2">{{ popularRecipes.length }}</span>
          </button>
        </li>
        <li class="nav-item">
          <button
            class="nav-link"
            :class="{ active: activeTab === 'bookmarked' }"
            @click="activeTab = 'bookmarked'"
          >
            <i class="bi bi-bookmark-heart me-2"></i>
            Bookmarked
            <span v-if="bookmarkedRecipes.length" class="badge bg-warning ms-2">{{ bookmarkedRecipes.length }}</span>
          </button>
        </li>
      </ul>

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-muted mt-3">Finding delicious recipes...</p>
      </div>

      <!-- Empty States -->
      <div v-else-if="displayedRecipes.length === 0" class="text-center py-5">
        <div v-if="activeTab === 'search'">
          <i class="bi bi-search display-1 text-muted mb-3"></i>
          <template v-if="searchQuery && searchQuery.trim()">
            <h5>No recipes found</h5>
            <p class="text-muted">Try a different ingredient or recipe name</p>
          </template>
          <template v-else>
            <h5>Search for recipes</h5>
            <p class="text-muted">Enter a recipe name, ingredient, or cuisine type to get started</p>
          </template>
        </div>
        <div v-else-if="activeTab === 'popular'">
          <i class="bi bi-star display-1 text-muted mb-3"></i>
          <h5>Loading popular recipes...</h5>
          <p class="text-muted">Discovering the most loved recipes</p>
        </div>
        <div v-else-if="activeTab === 'bookmarked'">
          <i class="bi bi-bookmark display-1 text-muted mb-3"></i>
          <h5>No bookmarked recipes</h5>
          <p class="text-muted">Bookmark recipes you like to save them for later</p>
        </div>
      </div>

      <!-- Recipe Grid -->
      <div v-else class="row g-4">
        <div v-for="recipe in displayedRecipes" :key="recipe.id" class="col-md-6 col-lg-4">
          <div class="recipe-card">
            <div class="recipe-image-container">
              <img :src="recipe.image" :alt="recipe.name" class="recipe-image" />
              <button 
                @click="toggleBookmark(recipe)"
                class="bookmark-btn"
                :class="{ bookmarked: isRecipeBookmarked(recipe.id) }"
              >
                <i :class="isRecipeBookmarked(recipe.id) ? 'bi bi-bookmark-heart-fill' : 'bi bi-bookmark-heart'"></i>
              </button>
            </div>
            
            <div class="recipe-content">
              <h6 class="recipe-title mb-2">{{ recipe.name }}</h6>
              
              <div class="recipe-meta mb-3">
                <span class="badge bg-light text-dark me-2">{{ recipe.category }}</span>
                <span class="badge bg-secondary">{{ recipe.area }}</span>
              </div>
              
              <div class="recipe-ingredients">
                <small class="text-muted">
                  <strong>Ingredients:</strong> 
                  {{ recipe.ingredients.slice(0, 3).join(', ') }}
                  <span v-if="recipe.ingredients.length > 3">...</span>
                </small>
              </div>
              
              <div class="recipe-button-container">
                <button @click="viewRecipe(recipe)" class="btn btn-primary btn-sm w-100">
                  <i class="bi bi-eye me-2"></i>
                  View Recipe
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recipe Detail Modal -->
    <div v-if="showRecipeModal && selectedRecipe" class="modal fade show d-block" tabindex="-1" style="z-index: 1055;">
      <div class="modal-backdrop fade show" @click="showRecipeModal = false" style="z-index: 1050;"></div>
      <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable" style="z-index: 1060;">
        <div class="modal-content">
          <div class="modal-body p-0">
            <button type="button" class="modal-close-btn" @click="showRecipeModal = false">
              <i class="bi bi-x-lg"></i>
            </button>
            <div class="row g-0 flex-column flex-md-row">
              <div class="col-md-5 order-1 order-md-0">
                <div class="modal-image-section p-4">
                  <img :src="selectedRecipe.image" :alt="selectedRecipe.name" class="img-fluid rounded-3 mb-4 w-100" style="aspect-ratio: 1; object-fit: cover;" />
                  
                  <div class="info-card mb-4">
                    <h6 class="mb-3"><i class="bi bi-info-circle me-2"></i>Recipe Info</h6>
                    <div class="row g-2">
                      <div class="col-6">
                        <small class="text-muted d-block">Category</small>
                        <span class="badge bg-primary">{{ selectedRecipe.category }}</span>
                      </div>
                      <div class="col-6">
                        <small class="text-muted d-block">Origin</small>
                        <span class="badge bg-success">{{ selectedRecipe.area }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="info-card">
                    <h6 class="mb-3"><i class="bi bi-list-ul me-2"></i>Ingredients</h6>
                    <div class="ingredients-list">
                      <div v-for="ingredient in selectedRecipe.ingredients" :key="ingredient" class="ingredient-item">
                        <i class="bi bi-dot text-primary"></i>
                        <span>{{ ingredient }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="col-md-7 order-0 order-md-1">
                <div class="modal-content-section p-4 d-flex flex-column">
                  <div class="recipe-name-section mb-4">
                    <h3 class="recipe-name">{{ selectedRecipe.name }}</h3>
                    <p class="text-muted mb-0">Follow these step-by-step instructions</p>
                  </div>
                  
                  <div class="instructions-section">
                    <h6 class="mb-3"><i class="bi bi-clipboard-check me-2"></i>Instructions</h6>
                    <div class="instructions-content">
                      <div class="instructions-text">
                        <p class="formatted-instructions">{{ selectedRecipe.instructions }}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div class="action-buttons-section mt-auto">
                    <div class="d-flex gap-2 justify-content-center">
                      <button 
                        @click="toggleBookmark(selectedRecipe)"
                        class="btn btn-sm flex-fill"
                        :class="isRecipeBookmarked(selectedRecipe.id) ? 'btn-warning' : 'btn-outline-warning'"
                      >
                        <i :class="isRecipeBookmarked(selectedRecipe.id) ? 'bi bi-bookmark-heart-fill' : 'bi bi-bookmark-heart'" class="me-1"></i>
                        {{ isRecipeBookmarked(selectedRecipe.id) ? 'Saved' : 'Save' }}
                      </button>
                      
                      <a v-if="selectedRecipe.video" :href="selectedRecipe.video" target="_blank" class="btn btn-outline-danger btn-sm flex-fill">
                        <i class="bi bi-play-circle me-1"></i>
                        Video
                      </a>
                      
                      <a v-if="selectedRecipe.source" :href="selectedRecipe.source" target="_blank" class="btn btn-outline-primary btn-sm flex-fill">
                        <i class="bi bi-link-45deg me-1"></i>
                        Source
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recipe-card {
  background: white;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.recipe-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.recipe-image-container {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.recipe-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bookmark-btn {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6c757d;
  transition: all 0.2s ease;
}

.bookmark-btn:hover,
.bookmark-btn.bookmarked {
  background: #fff;
  color: #dc3545;
}

.recipe-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.recipe-title {
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.recipe-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.recipe-ingredients {
  font-size: 0.875rem;
  line-height: 1.4;
  flex-grow: 1;
  margin-bottom: 1rem;
}

.recipe-button-container {
  margin-top: auto;
  padding-bottom: 0.5rem;
}

.instructions-text {
  max-height: 300px;
  overflow-y: auto;
}

.nav-tabs .nav-link {
  border: none;
  background: none;
  color: #6c757d;
  border-radius: 0.5rem;
  margin-right: 0.5rem;
  padding: 0.75rem 1rem;
}

.nav-tabs .nav-link.active {
  background: var(--primary-green);
  color: white;
}

.nav-tabs .nav-link:hover:not(.active) {
  background: rgba(5, 150, 105, 0.1);
  color: #059669;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1055;
}

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1050;
}

.modal-dialog {
  position: relative;
  z-index: 1060;
  pointer-events: auto;
}

.modal-content {
  background: white;
  border: none;
  border-radius: 0.75rem;
  box-shadow: 0 10px 50px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  position: relative;
}

.modal-close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 1070;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
  color: #6c757d;
  font-size: 1.2rem;
}

.modal-close-btn:hover {
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  color: #dc3545;
}

.modal-image-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-right: 1px solid #dee2e6;
}

.modal-content-section {
  background: white;
  min-height: 400px;
}

@media (max-width: 991.98px) {
  .modal-image-section {
    border-right: none;
    border-bottom: 1px solid #dee2e6;
  }
  
  .modal-content-section {
    min-height: auto;
  }
  
  .recipe-name {
    font-size: 1.5rem;
  }
}

.recipe-name-section {
  border-bottom: 2px solid #e9ecef;
  padding-bottom: 1rem;
}

.recipe-name {
  color: var(--primary-green, #059669);
  font-weight: 700;
  margin-bottom: 0.5rem;
  line-height: 1.2;
}

.info-card {
  background: white;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e9ecef;
}

.ingredients-list {
  max-height: 200px;
  overflow-y: auto;
}

.ingredient-item {
  display: flex;
  align-items: center;
  padding: 0.25rem 0;
  font-size: 0.875rem;
  line-height: 1.4;
}

.ingredient-item i {
  margin-right: 0.5rem;
  font-size: 1.2rem;
}

.instructions-section {
  background: #f8f9fa;
  border-radius: 0.5rem;
  padding: 1.5rem;
  border: 1px solid #e9ecef;
}

.instructions-content {
  max-height: 350px;
  overflow-y: auto;
}

.formatted-instructions {
  white-space: pre-line;
  line-height: 1.7;
  margin-bottom: 0;
  color: #495057;
  font-size: 0.95rem;
}

.action-buttons-section {
  background: #f8f9fa;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-top: 1rem;
  border: 1px solid #e9ecef;
}

.modal-header {
  background: linear-gradient(135deg, var(--primary-green, #059669) 0%, #065f46 100%);
  color: white;
  border-bottom: none;
  padding: 1.5rem;
}

.modal-header .modal-title {
  font-weight: 600;
  font-size: 1.25rem;
}

.modal-header .btn-close {
  filter: invert(1);
  opacity: 0.8;
}

.modal-header .btn-close:hover {
  opacity: 1;
}
</style>