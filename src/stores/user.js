import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useUserStore = defineStore('user', () => {
  // State
  const user = ref(null)
  const isAuthenticated = ref(false)

  // Load user from localStorage on store initialization
  const loadUser = () => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        user.value = JSON.parse(stored)
        isAuthenticated.value = true
      }
    } catch (error) {
      console.error('Error loading user from localStorage:', error)
      logout() // Clear corrupted data
    }
  }

  // Save user to localStorage whenever user changes
  watch(user, (newUser) => {
    if (newUser) {
      try {
        localStorage.setItem('user', JSON.stringify(newUser))
        isAuthenticated.value = true
      } catch (error) {
        console.error('Error saving user to localStorage:', error)
      }
    }
  }, { deep: true })

  // Actions
  const login = (userData) => {
    user.value = userData
    isAuthenticated.value = true
    // localStorage is automatically updated by the watcher
  }

  const logout = () => {
    user.value = null
    isAuthenticated.value = false
    localStorage.removeItem('user')
    
    // Dispatch custom event for components that still listen to it
    window.dispatchEvent(new Event('userChange'))
  }

  const updateProfile = (updatedData) => {
    if (user.value) {
      user.value = { ...user.value, ...updatedData }
      // localStorage is automatically updated by the watcher
    }
  }

  // Getters
  const getUserName = () => user.value?.name || 'Guest'
  const getUserEmail = () => user.value?.email || ''
  const getUserId = () => user.value?.id || null

  // Initialize store
  loadUser()

  return {
    // State
    user,
    isAuthenticated,
    
    // Actions
    login,
    logout,
    updateProfile,
    loadUser,
    
    // Getters
    getUserName,
    getUserEmail,
    getUserId
  }
})