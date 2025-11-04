
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
const MIN_WORD_LENGTH_FOR_MATCHING = 3
// For multi-ingredient lookups
const MAX_LOOKUP_IDS = 30

// Reactive state
const activeTab = ref('suggested')
const searchQuery = ref('')
const searchFilterAll = ref('') // Independent filter for Match All section
const searchFilterAny = ref('') // Independent filter for Any section
const route = useRoute()
const isLoading = ref(false)
const searchResults = ref([])
// Multi-ingredient search results: Any (OR) and All (AND)
const searchResultsAny = ref([]) // union of ingredient searches (chicken OR rice)
const searchResultsAll = ref([]) // intersection of ingredient searches (chicken AND rice)
const searchAnyTotal = ref(0)
const searchAllTotal = ref(0)
const isLoadingAny = ref(false)
const isLoadingAll = ref(false)

// Simple in-memory cache for lookup.php results by idMeal
const lookupCache = new Map()
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
    if (typeof food.expirationDate.toDate === 'function') {
      // Firestore Timestamp
      expDate = food.expirationDate.toDate()
    } else if (food.expirationDate.seconds) {
      // Firestore Timestamp object with seconds property
      expDate = new Date(food.expirationDate.seconds * 1000)
    } else {
      // String or Date object
      expDate = new Date(food.expirationDate)
    }
  } else {
    return Infinity // no expiration date
  }

  // Validate the date
  if (isNaN(expDate.getTime())) {
    return Infinity
  }

  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const expMidnight = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate())
  const daysLeft = Math.floor((expMidnight - nowMidnight) / (1000 * 60 * 60 * 24))
  
  return daysLeft
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
    searchResultsAny.value = []
    searchResultsAll.value = []
    errorMessage.value = ''
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    // Check if user is searching for multiple ingredients (comma-separated)
    const ingredients = query.split(',').map(i => i.trim()).filter(i => i.length > 0)

    // Reset multi-result refs
    searchResultsAny.value = []
    searchResultsAll.value = []

    if (ingredients.length > 1) {
      // For each ingredient, get the list of meal ids (try filter.php then fallback to search.php)
      const perIngredientIds = await Promise.all(ingredients.map(async (ingredient) => {
        try {
          // Run both requests in parallel
          const [filterResult, searchResult] = await Promise.allSettled([
            axios.get(`${API_BASE_URL}/filter.php`, {
              params: { i: ingredient },
              timeout: REQUEST_TIMEOUT
            }),
            axios.get(`${API_BASE_URL}/search.php`, {
              params: { s: ingredient },
              timeout: REQUEST_TIMEOUT
            })
          ])

          let meals = []
          if (filterResult.status === 'fulfilled' && filterResult.value.data.meals && filterResult.value.data.meals.length) {
            meals = filterResult.value.data.meals
          } else if (searchResult.status === 'fulfilled' && searchResult.value.data.meals && searchResult.value.data.meals.length) {
            meals = searchResult.value.data.meals
          }

          // Return set of ids for this ingredient
          return new Set(meals.map(m => m.idMeal))
        } catch (err) {
          console.error(`Error searching for ${ingredient}:`, err)
          return new Set()
        }
      }))

      // Compute union (any) and intersection (all)
      const unionIds = new Set()
      perIngredientIds.forEach(s => s.forEach(id => unionIds.add(id)))

      // Intersection: start with first set, then keep only those present in all
      let intersectionIds = new Set(perIngredientIds[0] || [])
      for (let i = 1; i < perIngredientIds.length; i++) {
        intersectionIds = new Set([...intersectionIds].filter(id => perIngredientIds[i].has(id)))
      }

      // Helper to fetch full recipe details for a set of ids
      // This uses lookupCache to avoid duplicate network calls and annotates each recipe
      // with `matchedIngredients` (which of the searched ingredients were found in the recipe)
      const fetchFullDetailsForIds = async (idIterable, allIdsTotal = 0) => {
        const ids = Array.from(idIterable)
        const promises = ids.map(async (id) => {
          try {
            // Use cache when available
            let fullMeal = lookupCache.get(id)
            if (!fullMeal) {
              const response = await axios.get(`${API_BASE_URL}/lookup.php`, {
                params: { i: id },
                timeout: REQUEST_TIMEOUT
              })
              fullMeal = response.data.meals?.[0] || null
              if (fullMeal) lookupCache.set(id, fullMeal)
            }

            if (fullMeal) {
              // compute matchedIngredients by comparing searchIngredients to meal name and ingredients
              const mealIngredients = getIngredientsList(fullMeal).map(ing => ing.toLowerCase())
              const recipeName = fullMeal.strMeal.toLowerCase()
              const matched = searchIngredients.value.filter(si => {
                const s = si.toLowerCase()
                if (recipeName.includes(s)) return true
                return mealIngredients.some(ing => ing.includes(s) || s.includes(ing))
              })

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
                matchedIngredients: matched
              }
            }
          } catch (err) {
            console.error(`Error fetching recipe ${id}:`, err)
          }
          return null
        })
        return (await Promise.all(promises)).filter(r => r !== null)
      }

        // Prepare totals and cap IDs fetched to avoid too many lookup requests
        searchAnyTotal.value = unionIds.size
        searchAllTotal.value = intersectionIds.size

        const unionIdsArray = Array.from(unionIds)
        const intersectionIdsArray = Array.from(intersectionIds)

        const unionToFetch = new Set(unionIdsArray.slice(0, MAX_LOOKUP_IDS))
        const intersectionToFetch = new Set(intersectionIdsArray.slice(0, MAX_LOOKUP_IDS))

        // Fetch union (any) results
        if (unionToFetch.size > 0) {
          isLoadingAny.value = true
          searchResultsAny.value = await fetchFullDetailsForIds(unionToFetch, unionIds.size)
          isLoadingAny.value = false
        } else {
          searchResultsAny.value = []
        }

        // Fetch intersection (all) results
        if (intersectionToFetch.size > 0) {
          isLoadingAll.value = true
          searchResultsAll.value = await fetchFullDetailsForIds(intersectionToFetch, intersectionIds.size)
          isLoadingAll.value = false
        } else {
          searchResultsAll.value = []
        }

      // Keep searchResults empty for multi-search to avoid confusion in template
      searchResults.value = []
    } else {
      // Single ingredient or free-text search - use original logic
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

      // clear multi-search results
      searchResultsAny.value = []
      searchResultsAll.value = []
    }
  } catch (error) {
    console.error('Error searching recipes:', error)
    errorMessage.value = handleApiError(error)
    searchResults.value = []
    searchResultsAny.value = []
    searchResultsAll.value = []
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

    // Extract ingredient keywords - use the full name for better matching
    const ingredients = [...new Set(expiringFoods.map(food => food.name.toLowerCase().trim()))]

    // Cache for failed filter.php requests to avoid redundant search.php calls
    const filterFailedCache = new Set()

    // Try searching by ingredient filter first, then fallback to general search
    const recipePromises = ingredients.map(async (ingredient) => {
      try {
        // First try: ingredient filter
        let response = await axios.get(`${API_BASE_URL}/filter.php`, {
          params: { i: ingredient },
          timeout: REQUEST_TIMEOUT
        })
        let meals = response.data.meals || []
        
        // If no results, try general search as fallback (only once per ingredient)
        if (meals.length === 0 && !filterFailedCache.has(ingredient)) {
          filterFailedCache.add(ingredient)
          response = await axios.get(`${API_BASE_URL}/search.php`, {
            params: { s: ingredient },
            timeout: REQUEST_TIMEOUT
          })
          meals = response.data.meals || []
        }
        
        return meals
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

    // Pre-compute normalized food tokens for faster matching
    const normalizedFoods = expiringFoods.map(food => {
      const foodName = food.name.toLowerCase()
      const foodWords = foodName.split(/\s+/).filter(w => w.length >= MIN_WORD_LENGTH_FOR_MATCHING)
      return {
        name: food.name,
        normalized: foodName,
        words: new Set(foodWords)
      }
    })

    const fullRecipePromises = uniqueMeals.map(async (meal) => {
      try {
        const response = await axios.get(`${API_BASE_URL}/lookup.php`, {
          params: { i: meal.idMeal },
          timeout: REQUEST_TIMEOUT
        })
        if (response.data.meals?.[0]) {
          const fullMeal = response.data.meals[0]
          const mealIngredients = getIngredientsList(fullMeal).map(ing => ing.toLowerCase())
          const recipeName = fullMeal.strMeal.toLowerCase()
          
          // Match expiring foods to recipe ingredients OR recipe name
          const suggestingFoods = normalizedFoods.filter(food => {
            // Check recipe name first
            if (recipeName.includes(food.normalized)) return true
            if ([...food.words].some(word => recipeName.includes(word))) return true
            
            // Check if any recipe ingredient contains the food name or any significant word
            return mealIngredients.some(ing => {
              // Direct match
              if (ing.includes(food.normalized) || food.normalized.includes(ing)) return true
              
              // Check individual words from pre-computed set
              return [...food.words].some(word => {
                return ing.includes(word) || word.includes(ing)
              })
            })
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

// Computed helpers for multi-ingredient detection
const searchIngredients = computed(() =>
  searchQuery.value.split(',').map(i => i.trim()).filter(i => i.length > 0)
)
const isMultiSearch = computed(() => searchIngredients.value.length > 1)

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
  
  // Check if instructions have leading numbers like "01.", "1.", "1)", etc.
  const hasLeadingNumbers = /^\s*0?\d+[\.\):]/.test(instructions)
  
  if (hasLeadingNumbers) {
    // Split by line breaks first, then clean up step numbers
    const steps = instructions
      .split(/[\r\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(step => {
        // Remove leading numbers like "01.", "1.", "02)", "STEP 1:", etc.
        return step.replace(/^\s*0?(\d+)[\.\):]?\s*/i, '')
      })
      .filter(s => s.length > 10) // Keep only substantial steps
    
    return steps
  }
  
  // Check for STEP format
  const hasStepFormat = /\bSTEP\s+\d+/i.test(instructions)
  
  if (hasStepFormat) {
    const steps = instructions
      .split(/(?=\s*\bSTEP\s+\d+)/i)
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    return steps.map(step => 
      step.replace(/^\s*\bSTEP\s+\d+[:\.\)]?\s*/i, '')
    )
  }
  
  // No numbers - split by line breaks or sentences
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
  <div class="recipes-page">
    <!-- Hero Section - Full Width -->
    <div class="hero-full-width">
      <HeroSection
        v-model:search-query="searchQuery"
        v-model:active-tab="activeTab"
        @search="handleSearch"
        @clear-search="searchQuery = ''"
      />
    </div>

  <div class="container-fluid px-3 px-md-4 py-3">
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
          <!-- Single-term or free-text search -->
          <div v-if="!isMultiSearch">
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

          <!-- Multi-ingredient search: show BOTH intersection (AND) and union (ANY) -->
          <div v-else>
            <!-- Combined title for multi-search -->
            <div class="mb-4">
              <h4 class="mb-1">
                Recipes for <strong>{{ searchIngredients.join(' + ') }}</strong>
              </h4>
              <small class="text-muted">Showing recipes that match all ingredients, or any of them below.</small>
            </div>

            <!-- Match All Section -->
            <div class="mb-5">
              <div v-if="isLoadingAll" class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-muted mt-2 mb-0">Finding recipes...</p>
              </div>

              <EmptyState
                v-else-if="searchResultsAll.length === 0"
                icon="bi-emoji-frown"
                title="No recipes contain all ingredients"
                message="Try fewer ingredients or broader keywords"
              />

              <RecipeGrid
                v-else
                v-model:search-filter="searchFilterAll"
                :show-filter="true"
                :recipes="searchResultsAll"
                title="Match All Ingredients"
                :show-title="true"
                badge-variant="primary"
                :is-bookmarked-fn="isRecipeBookmarked"
                :count-ingredients-fn="countUserIngredients"
                @view-recipe="viewRecipe"
                @toggle-bookmark="toggleBookmark"
              />
            </div>

            <!-- Any Ingredient Section -->
            <div class="mt-5">
              <div v-if="isLoadingAny" class="text-center py-5">
                <div class="spinner-border text-secondary" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-muted mt-2 mb-0">Finding recipes...</p>
              </div>

              <EmptyState
                v-else-if="searchResultsAny.length === 0"
                icon="bi-emoji-frown"
                title="No results found"
                message="Try different keywords or check your network connection"
              />

              <RecipeGrid
                v-else
                v-model:search-filter="searchFilterAny"
                :recipes="searchResultsAny"
                title="Any Ingredient"
                :show-title="true"
                badge-variant="secondary"
                :show-filter="true"
                :is-bookmarked-fn="isRecipeBookmarked"
                :count-ingredients-fn="countUserIngredients"
                @view-recipe="viewRecipe"
                @toggle-bookmark="toggleBookmark"
              />
            </div>
          </div>
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
</div>
</template>
<style scoped>
/* Main page layout */
.recipes-page {
  min-height: 100vh;
  background: #f8f9fa;
}

/* Hero section - full width */
.hero-full-width {
  width: 100%;
  padding: 0;
  margin: 0;
  background: transparent;
}

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