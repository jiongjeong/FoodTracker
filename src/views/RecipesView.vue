
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
import LoadingSpinner from '../components/recipes/LoadingSpinner.vue'
import ErrorAlert from '../components/recipes/ErrorAlert.vue'


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
<div class="bg-light min-vh-100">
  <div class="container-fluid px-4 py-3">
    <!-- Hero Section -->
    <HeroSection
      v-model:search-query="searchQuery"
      v-model:active-tab="activeTab"
      @search="handleSearch"
      @clear-search="searchQuery = ''"
    />

    <!-- Error Message -->
    <ErrorAlert :message="errorMessage" @close="errorMessage = ''" />

    <!-- Loading State -->
    <Transition name="fade">
      <LoadingSpinner v-if="isLoading" />
    </Transition>

    <!-- Content based on active tab -->
    <Transition name="fade" mode="out-in">
      <div v-if="!isLoading" key="content">
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
    </Transition>

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
</div>
</template>
<style scoped>
/* Fade transition for content switching */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.recipe-discovery-page {
    background: url('/recipe-bg.jpg');
}
</style>