import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useUserStore } from './user.js'

export const useRecipesStore = defineStore('recipes', () => {
  const bookmarkedRecipes = ref([])
  
  // Future: Add database sync capability
  const dbSyncEnabled = ref(false) // Toggle when backend is ready
  
  const loadBookmarks = async () => {
    try {
      if (dbSyncEnabled.value) {
        // Future: Load from database when available
        const userStore = useUserStore()
        if (userStore.isAuthenticated) {
          const dbBookmarks = await api.getBookmarks(userStore.getUserId())
          bookmarkedRecipes.value = dbBookmarks
          return
        }
      }
      
      // Fallback to localStorage (current approach)
      const stored = localStorage.getItem('bookmarked_recipes')
      if (stored) {
        bookmarkedRecipes.value = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error)
      bookmarkedRecipes.value = []
    }
  }

  const saveBookmarks = async () => {
    try {
      // Always save to localStorage as backup
      localStorage.setItem('bookmarked_recipes', JSON.stringify(bookmarkedRecipes.value))
      
      if (dbSyncEnabled.value) {
        // Future: Also sync to database
        const userStore = useUserStore()
        if (userStore.isAuthenticated) {
          await api.syncBookmarks(userStore.getUserId(), bookmarkedRecipes.value)
        }
      }
    } catch (error) {
      console.error('Error saving bookmarks:', error)
    }
  }

  // Watch for changes and auto-save
  watch(bookmarkedRecipes, () => {
    saveBookmarks()
  }, { deep: true })

  const addBookmark = (recipe) => {
    const isAlreadyBookmarked = bookmarkedRecipes.value.some(
      bookmark => bookmark.idMeal === recipe.idMeal
    )
    
    if (!isAlreadyBookmarked) {
      bookmarkedRecipes.value.push(recipe)
    }
  }

  const removeBookmark = (recipeId) => {
    const index = bookmarkedRecipes.value.findIndex(
      bookmark => bookmark.idMeal === recipeId
    )
    
    if (index > -1) {
      bookmarkedRecipes.value.splice(index, 1)
    }
  }

  const toggleBookmark = (recipe) => {
    const isBookmarked = isRecipeBookmarked(recipe.idMeal)
    
    if (isBookmarked) {
      removeBookmark(recipe.idMeal)
    } else {
      addBookmark(recipe)
    }
  }

  // Getters
  const isRecipeBookmarked = (recipeId) => {
    return bookmarkedRecipes.value.some(bookmark => bookmark.idMeal === recipeId)
  }

  const getBookmarkCount = () => bookmarkedRecipes.value.length

  // Initialize
  loadBookmarks()

  return {
    bookmarkedRecipes,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    isRecipeBookmarked,
    getBookmarkCount,
    
    // Future: Enable database sync
    enableDatabaseSync: () => { dbSyncEnabled.value = true }
  }
})