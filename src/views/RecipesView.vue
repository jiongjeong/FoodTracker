
<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { auth } from '../firebase.js'
import { onAuthStateChanged } from 'firebase/auth'
import { useRecipesStore } from '../stores/recipes.js'
import { db } from '../firebase.js'
import { collection, getDocs, query } from 'firebase/firestore'
import HeroSection from '../components/recipes/HeroSection.vue'
import RecipeGrid from '../components/recipes/RecipeGrid.vue'
import EmptyState from '../components/recipes/EmptyState.vue'
import RecipeModal from '../components/recipes/RecipeModal.vue'


// Configuration constants
const API_BASE_URL = 'https://www.themealdb.com/api/json/v1/1'
const MAX_INGREDIENTS = 40
const REQUEST_TIMEOUT = 10000
const MAX_SUGGESTED_RECIPES = 10
const EXPIRING_SOON_DAYS = 7

// Reactive state
const activeTab = ref('suggested')
const searchQuery = ref('')
const searchFilter = ref('')
const route = useRoute()
const isLoading = ref(false)
const searchResults = ref([])
const suggestedRecipes = ref([])
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

// Helper function to calculate days left until expiration
const getDaysLeft = (food) => {
  const now = new Date()
  let expDate

  if (food.expirationDate) {
    if (food.expirationDate.toDate) {
      expDate = food.expirationDate.toDate()
    } else {
      expDate = new Date(food.expirationDate)
    }
  } else {
    return Infinity // no expiration date
  }

  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const expMidnight = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate())
  return Math.floor((expMidnight - nowMidnight) / (1000 * 60 * 60 * 24))
}

// Fetch full recipe objects for bookmarked IDs
const fetchBookmarkedRecipes = async () => {
  const ids = bookmarkedRecipes.value
    .map(r => (typeof r === 'object' ? r.idMeal || r.id : r))
    .filter(Boolean)
  const recipes = []
  for (const id of ids) {
    try {
      const response = await axios.get(`${API_BASE_URL}/lookup.php`, { 
        params: { i: id }, 
        timeout: REQUEST_TIMEOUT 
      })
      if (response.data.meals?.[0]) {
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
      console.error('Error fetching bookmarked recipe:', e)
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

// Get suggested recipes based on expiring ingredients
const getSuggestedRecipes = async () => {
  if (!userId.value) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const q = query(collection(db, 'user', userId.value, 'foodItems'))
    const querySnapshot = await getDocs(q)
    const foodItems = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    const expiringFoods = foodItems.filter(food => {
      const daysLeft = getDaysLeft(food)
      return daysLeft >= 0 && daysLeft <= EXPIRING_SOON_DAYS
    })

    if (expiringFoods.length === 0) {
      suggestedRecipes.value = []
      return
    }

    const ingredients = [...new Set(expiringFoods.map(food => {
      const words = food.name.toLowerCase().split(' ')
      return words[words.length - 1]
    }))]

    const recipePromises = ingredients.map(async (ingredient) => {
      try {
        const response = await axios.get(`${API_BASE_URL}/filter.php`, {
          params: { i: ingredient },
          timeout: REQUEST_TIMEOUT
        })
        return response.data.meals || []
      } catch (error) {
        console.error(`Error searching recipes for ${ingredient}:`, error)
        return []
      }
    })

    const recipeResults = await Promise.all(recipePromises)
    const allMeals = recipeResults.flat()

    const uniqueMeals = allMeals.filter((meal, index, self) =>
      index === self.findIndex(m => m.idMeal === meal.idMeal)
    ).slice(0, MAX_SUGGESTED_RECIPES)

    const fullRecipePromises = uniqueMeals.map(async (meal) => {
      try {
        const response = await axios.get(`${API_BASE_URL}/lookup.php`, {
          params: { i: meal.idMeal },
          timeout: REQUEST_TIMEOUT
        })
        if (response.data.meals?.[0]) {
          const fullMeal = response.data.meals[0]
          const mealIngredients = getIngredientsList(fullMeal).map(ing => ing.toLowerCase())
          const suggestingFoods = expiringFoods.filter(food => {
            const words = food.name.toLowerCase().split(' ')
            const ingredient = words[words.length - 1]
            return mealIngredients.some(ing => ing.includes(ingredient))
          }).map(food => food.name)

          return {
            id: fullMeal.idMeal,
            name: fullMeal.strMeal,
            image: fullMeal.strMealThumb,
            category: fullMeal.strCategory,
            area: fullMeal.strArea,
            instructions: fullMeal.strInstructions,
            ingredients: getIngredientsList(fullMeal),
            video: fullMeal.strYoutube,
            source: fullMeal.strSource,
            suggestedBy: [...new Set(suggestingFoods)]
          }
        }
      } catch (error) {
        console.error(`Error fetching full recipe for ${meal.idMeal}:`, error)
      }
      return null
    })

    const fullRecipes = (await Promise.all(fullRecipePromises)).filter(recipe => recipe !== null)
    suggestedRecipes.value = fullRecipes
  } catch (error) {
    console.error('Error getting suggested recipes:', error)
    errorMessage.value = handleApiError(error)
    suggestedRecipes.value = []
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

// User pantry foods (simplified keywords) - loaded from Firestore
const userFoods = ref([])
const userFoodKeywords = computed(() => {
  const set = new Set()
  userFoods.value.forEach(f => {
    if (!f?.name) return
    const words = f.name.toLowerCase().split(/\s+/)
    const kw = words[words.length - 1].replace(/[^a-z]/g, '')
    if (kw) set.add(kw)
    set.add(f.name.toLowerCase())
  })
  return set
})

const loadUserFoods = async () => {
  if (!userId.value) {
    userFoods.value = []
    return
  }
  try {
    const q = query(collection(db, 'user', userId.value, 'foodItems'))
    const snapshot = await getDocs(q)
    userFoods.value = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (e) {
    console.error('Error loading user foods:', e)
    userFoods.value = []
  }
}

// Count how many ingredients from a recipe the user has in their pantry
const countUserIngredients = (recipe) => {
  if (!recipe?.ingredients || !userFoodKeywords.value) return 0
  let count = 0
  recipe.ingredients.forEach(ing => {
    if (!ing) return
    const words = ing.toLowerCase().split(/\s+/)
    const last = words[words.length - 1].replace(/[^a-z]/g, '')
    if (last && (userFoodKeywords.value.has(last) || 
        [...userFoodKeywords.value].some(k => k.includes(last) || last.includes(k)))) {
      count++
    }
  })
  return count
}

// Format instructions with step numbering (handles recipes that already have numbers)
const formatInstructions = (instructions) => {
  if (!instructions) return []
  
  const hasNumbers = /^\s*(\d+[\.\):]|\bSTEP\s+\d+)/im.test(instructions)
  
  if (hasNumbers) {
    const steps = instructions
      .split(/(?=\s*(?:\d+[\.\):]|\bSTEP\s+\d+))/i)
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    return steps.map(step => 
      step.replace(/^\s*(\d+[\.\):]|\bSTEP\s+\d+[:\.\)]?)\s*/i, '')
    )
  } else {
    const steps = instructions
      .split(/[\r\n]+/)
      .flatMap(line => {
        if (line.length > 150) {
          return line.split(/\.\s+/).filter(s => s.trim().length > 10)
        }
        return [line]
      })
      .map(s => s.trim())
      .filter(s => s.length > 10)
    
    return steps
  }
}

// Handle search
const handleSearch = async () => {
  activeTab.value = 'search'
  searchFilter.value = ''
  await searchRecipes(searchQuery.value)
}

// View recipe details
const viewRecipe = (recipe) => {
  selectedRecipe.value = recipe
  showRecipeModal.value = true
}

// Computed formatted instructions for modal
const formattedInstructions = computed(() => 
  selectedRecipe.value ? formatInstructions(selectedRecipe.value.instructions) : []
)

// Handle tab change
const handleTabChange = (tab) => {
  activeTab.value = tab
  if (tab === 'search') {
    searchQuery.value = ''
  }
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

onAuthStateChanged(auth, async (u) => {
  user.value = u
  if (u) {
    await recipesStore.loadBookmarks()
    await loadUserFoods()
    await getSuggestedRecipes()
  }
})
</script>

<template>
<div class="recipe-discovery-page" style="background: #faf8f5; min-height: 100vh; position: relative; overflow: hidden;">
  <div class="container-fluid p-4">
    <!-- Hero Section -->
    <div class="row align-items-center min-vh-100 p-4 p-md-5 mb-4 position-relative">
      <!-- Decorative Background Blobs -->
    <!-- Decorative Circular Blobs -->
<!-- blob container: keep behind interactive elements -->
<div class="position-absolute top-0 end-0 h-100 w-50 recipe-blobs" style="z-index: 0; pointer-events: none;">
  <!-- Top pink-red blob -->
  <div 
    class="position-absolute top-0 end-0 rounded-circle bg-danger bg-gradient opacity-75 shadow "
    style="width: 350px; height: 350px; background: radial-gradient(circle at 30% 30%, #ff8882, #ff6b6b); transform: translate(20%, -20%);">
  </div>

  <!-- Bottom yellow blob -->
  <div 
    class="position-absolute bottom-0 end-0 rounded-circle bg-warning bg-gradient opacity-75 shadow recipe-blob-yellow"
    style="width: 280px; height: 280px; background: radial-gradient(circle at 70% 70%, #ffeaa7, #fdcb6e); transform: translate(20%, 20%); z-index: 0;">
  </div>
</div>


      <!-- Floating Ingredients -->
      <!-- Floating Ingredients -->
<div class="floating-ingredient position-absolute" 
     style="top: 55%; left: 40%; font-size: 2rem; animation-delay: 0s;">🍅</div>

<div class="floating-ingredient position-absolute" 
     style="top: 15%; left: 48%; font-size: 1.8rem; animation-delay: 1s;">🌽</div>

<div class="floating-ingredient position-absolute" 
     style="top: 10%; left: 54%; font-size: 1.6rem; animation-delay: 2s;">🍃</div>

<div class="floating-ingredient position-absolute" 
     style="top: 57%; left: 50%; font-size: 1.5rem; animation-delay: 3s;">🫑</div>

      <!-- Left Content -->
      <div class="col-lg-6 position-relative" style="z-index: 10;">
        <div class="mb-4">
          <h1 class="display-3 fw-bold mb-3" style="color: #2d3436; line-height: 1.2;">
            Discover<br>
            <span style="color: #00b894;">fresh recipes </span>
          </h1>
          <p class="lead text-muted mb-4" style="letter-spacing: 0.5px;">
            to cut waste and boost flavor 🌿
          </p>
        </div>


        <!-- Search Bar -->
        <div class="input-group shadow-sm mb-4" style="max-width: 400px; border-radius: 50px; overflow: hidden; background: white;">
          <input
            v-model="searchQuery"
            type="text"
            class="form-control border-0 m-2"
            placeholder="Search any recipe..."
            @keyup.enter="handleSearch"
            style="padding: 15px 10px;"
          />
          <button class="btn m-1" @click="handleSearch" style="background: linear-gradient(135deg, #00b894 0%, #00cec9 100%); color: white; padding: 0 25px; border-radius: 50px">
            <i class="bi bi-arrow-right fs-5"></i>
          </button>
        </div>
    </div>
      <!-- Right Content - Food Image -->
      <div class="col-lg-6 position-relative d-lg-block" style="z-index: 5;">
        <div class="position-relative">
          <!-- Main Food Plate Circle with Grooves -->
          <div class="position-relative rounded-circle filter:blur(30px) shadow-lg overflow-hidden d-flex align-items-center justify-content-center food-plate" style="width: 400px; height: 400px; background: #2d3436;">
            <img src="../../public/food.jpg" alt="Delicious Salad"  style="object-fit: cover; width: 450px; height:450px" />
          </div>
        </div>
      </div>
      <!-- Category Pills -->
      <div
          class="category-pills d-flex gap-2 overflow-auto pb-2 mb-3"
          style="scrollbar-width: none; -ms-overflow-style: none;"
        >
        <button
          @click="activeTab = 'search'; searchQuery = ''"
          class="btn rounded-pill flex-shrink-0 px-4 py-2"
          :class="activeTab === 'search' ? 'btn-success text-white shadow-active' : 'btn-light shadow-soft'"
          style="white-space: nowrap;"
        >
          See All
        </button>

        <button
          @click="activeTab = 'suggested'"
          class="btn rounded-pill flex-shrink-0 px-4 py-2"
          :class="activeTab === 'suggested' ? 'btn-success text-white shadow-active' : 'btn-light shadow-soft'"
          style="white-space: nowrap;"
        >
          <span class="me-2">💡</span>
          Recommended
      </button>
        <button
          @click="activeTab = 'bookmarked'"
          class="btn rounded-pill flex-shrink-0 px-4 py-2"
          :class="activeTab === 'bookmarked' ? 'btn-success text-white shadow-active' : 'btn-light shadow-soft'"
          style="white-space: nowrap;"
        >
          <span class="me-2">❤️</span>
          Bookmarked
        </button>
      </div>
    </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="alert alert-danger d-flex align-items-center mb-4 rounded-4">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        <span>{{ errorMessage }}</span>
        <button type="button" class="btn-close ms-auto" @click="errorMessage = ''"></button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-5">
        <div class="spinner-border text-success" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-muted mt-3 fw-semibold">Finding delicious recipes...</p>
      </div>

      <!-- Content based on active tab -->
      <div v-else>
        <!-- Search Results Tab -->
        <div v-if="activeTab === 'search'">
          <EmptyState
            v-if="searchResults.length === 0 && !searchQuery.trim()"
            icon="bi-search"
            title="Search for recipes"
            message="Enter a recipe name, ingredient, or cuisine type to get started"
          />
          <EmptyState
            v-else-if="searchResults.length === 0 && searchQuery.trim()"
            icon="bi-emoji-frown"
            title="No results found"
            message="Try searching with different keywords or ingredients"
          />
          <RecipeGrid
            v-else
            v-model:search-filter="searchFilter"
            :recipes="searchResults"
            title="Search Results"
            badge-variant="primary"
            :show-filter="true"
            :is-bookmarked-fn="isRecipeBookmarked"
            :count-ingredients-fn="countUserIngredients"
            @view-recipe="viewRecipe"
            @toggle-bookmark="toggleBookmark"
          />
        </div>

        <!-- Suggested Recipes Tab -->
        <div v-else-if="activeTab === 'suggested'">
          <EmptyState
            v-if="suggestedRecipes.length === 0"
            icon="bi-lightbulb"
            title="No suggested recipes"
            message="No food items expiring soon, or no recipes found for your ingredients"
          />
          <RecipeGrid
            v-else
            :recipes="suggestedRecipes"
            title="Recommended For You"
            badge-variant="success"
            :show-time-estimate="true"
            :show-suggested-by="true"
            :is-bookmarked-fn="isRecipeBookmarked"
            :count-ingredients-fn="countUserIngredients"
            @view-recipe="viewRecipe"
            @toggle-bookmark="toggleBookmark"
          />
        </div>

        <!-- Bookmarked Recipes Tab -->
        <div v-else-if="activeTab === 'bookmarked'">
          <EmptyState
            v-if="bookmarkedRecipeObjects.length === 0"
            icon="bi-bookmark-heart"
            title="No bookmarked recipes"
            message="Bookmark recipes you like to save them for later"
          />
          <RecipeGrid
            v-else
            :recipes="bookmarkedRecipeObjects"
            title="Your Bookmarks"
            badge-variant="warning"
            :is-bookmarked-fn="isRecipeBookmarked"
            :count-ingredients-fn="countUserIngredients"
            @view-recipe="viewRecipe"
            @toggle-bookmark="toggleBookmark"
          />
        </div>
      </div>
    </div>

    <!-- Recipe Detail Modal -->
    <RecipeModal
      v-if="showRecipeModal && selectedRecipe"
      :recipe="selectedRecipe"
      :is-bookmarked="isRecipeBookmarked(selectedRecipe.id)"
      :formatted-instructions="formattedInstructions"
      @close="showRecipeModal = false"
      @toggle-bookmark="toggleBookmark"
    />
  </div>
</template>
<style scoped>
@keyframes riseAndFloat {
  0% {
    transform: translateY(0) scale(0.6);
    opacity: 0;
  }
  20% {
    opacity: 1;
    transform: translateY(-10px) scale(1);
  }
  50% {
    transform: translateY(-25px) scale(1.1);
  }
  80% {
    opacity: 0.8;
    transform: translateY(-40px) scale(1.05);
  }
  100% {
    transform: translateY(-60px) scale(1);
    opacity: 0;
  }
}

.floating-ingredient {
  animation: riseAndFloat 4s ease-in-out infinite;
  pointer-events: none;
  transform-origin: center;
}


.category-pill {
  transition: all 0.3s ease;
  cursor: pointer;
}

.category-pill:hover {
  transform: translateY(-8px) scale(1.05);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15) !important;
}

.category-pill.active {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(253, 203, 110, 0.4) !important;
}

.social-btn {
  transition: all 0.3s ease;
}

.social-btn:hover {
  transform: scale(1.15);
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%) !important;
}

.input-group:focus-within {
  box-shadow: 0 6px 20px rgba(0, 184, 148, 0.25) !important;
  transform: translateY(-2px);
  transition: all 0.3s ease;
}

.food-plate {
  animation: plateRotate 20s linear infinite;
}

@keyframes plateRotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.discount-badge {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.nav-link {
  transition: color 0.3s ease;
}

.nav-link:hover {
  color: #00b894 !important;
}
.shadow-soft {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease-in-out;
}

/* Ensure the category pills (tabs) sit above decorative blobs on small screens */
.category-pills {
  position: relative; /* create stacking context */
  z-index: 20; /* above blobs which use z-index 0/1 */
}

/* Make sure decorative blobs are visually behind and non-interactive on very small viewports */
@media (max-width: 575px) {
  .recipe-blobs,
  .recipe-blob-yellow {
    z-index: 0 !important;
    pointer-events: none !important;
  }
  /* ensure pill buttons remain fully interactive above blobs */
  .category-pills .btn {
    position: relative;
    z-index: 30;
  }
}

/* Slightly lifted shadow + glow for active tab */
.shadow-active {
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3), 0 0 4px rgba(34, 197, 94, 0.4);
  transition: all 0.25s ease-in-out;
}

/* Subtle lift on hover */
.category-pills .btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.recipe-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.recipe-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15) !important;
}

.recipe-card .recipe-image-container::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.3), transparent);
  pointer-events: none;
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


.instructions-text {
  flex-grow: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
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
  .instructions-section {
    background: #f8f9fa;
    border-radius: 0.5rem;
    padding: 1.5rem;
    border: 1px solid #e9ecef;
    flex-grow: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
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
  max-height: 500px;
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

.recipe-discovery-page {
    background: url('/recipe-bg.jpg');
}
</style>