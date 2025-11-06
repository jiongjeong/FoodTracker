import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useUserStore } from './user.js'
import { db } from '../firebase.js'
import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore'

export const useRecipesStore = defineStore('recipes', () => {
  const bookmarkedRecipes = ref([])


  const loadBookmarks = async () => {
    try {
      const userStore = useUserStore()
      const userId = userStore.getUserId()
      if (userStore.isAuthenticated && userId) {
        const recipesCollection = collection(db, 'user', userId, 'recipes')
        const snapshot = await getDocs(recipesCollection)
        const recipeIds = snapshot.docs.map(doc => doc.id)
        bookmarkedRecipes.value = recipeIds
      } else {
        const stored = localStorage.getItem('bookmarked_recipes')
        if (stored) {
          bookmarkedRecipes.value = JSON.parse(stored)
        } else {
          bookmarkedRecipes.value = []
        }
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error)
      bookmarkedRecipes.value = []
    }
  }

  watch(bookmarkedRecipes, () => {
    const userStore = useUserStore()
    if (!userStore.isAuthenticated) {
      localStorage.setItem('bookmarked_recipes', JSON.stringify(bookmarkedRecipes.value))
    }
  }, { deep: true })

  const addBookmark = async (recipe) => {
    const recipeId = recipe.idMeal || recipe.id
    if (!bookmarkedRecipes.value.includes(recipeId)) {
      bookmarkedRecipes.value.push(recipeId)
      const userStore = useUserStore()
      const userId = userStore.getUserId()
      if (userStore.isAuthenticated && userId) {
        try {
          const recipeDoc = doc(db, 'user', userId, 'recipes', recipeId)
          await setDoc(recipeDoc, { idMeal: recipeId, createdAt: new Date() })
        } catch (error) {
          console.error('Error adding bookmark to Firestore:', error)
        }
      }
    }
  }

  const removeBookmark = async (recipeId) => {
    const id = recipeId.idMeal || recipeId.id || recipeId
    const index = bookmarkedRecipes.value.indexOf(id)
    if (index > -1) {
      bookmarkedRecipes.value.splice(index, 1)
      const userStore = useUserStore()
      const userId = userStore.getUserId()
      if (userStore.isAuthenticated && userId) {
        try {
          const recipeDoc = doc(db, 'user', userId, 'recipes', id)
          await deleteDoc(recipeDoc)
        } catch (error) {
          console.error('Error removing bookmark from Firestore:', error)
        }
      }
    }
  }

  const toggleBookmark = async (recipe) => {
    const recipeId = recipe.idMeal || recipe.id
    const isBookmarked = isRecipeBookmarked(recipeId)
    if (isBookmarked) {
      await removeBookmark(recipeId)
    } else {
      await addBookmark(recipe)
    }
  }

  const isRecipeBookmarked = (recipeId) => {
    if (!recipeId) return false;
    let id = recipeId;
    if (typeof recipeId === 'object') {
      id = recipeId.idMeal || recipeId.id;
    }
    return id ? bookmarkedRecipes.value.includes(id) : false;
  }

  const getBookmarkCount = () => bookmarkedRecipes.value.length

  const initialized = ref(false)
  const initializeStore = async () => {
    if (!initialized.value) {
      await loadBookmarks()
      initialized.value = true
    }
  }

  initializeStore()

  return {
    bookmarkedRecipes,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    isRecipeBookmarked,
    getBookmarkCount,
    loadBookmarks,
    initializeStore,
    initialized
  }
})
