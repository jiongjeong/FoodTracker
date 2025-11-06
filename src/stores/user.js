import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { auth } from '../firebase.js'
import { onAuthStateChanged } from 'firebase/auth'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const isAuthenticated = ref(false)

  const loadUser = () => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        user.value = JSON.parse(stored)
        isAuthenticated.value = true
      }
    } catch (error) {
      console.error('Error loading user from localStorage:', error)
      logout()
    }
  }

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

  onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      user.value = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email,
        photoURL: firebaseUser.photoURL
      }
      isAuthenticated.value = true
    } else {
      user.value = null
      isAuthenticated.value = false
      localStorage.removeItem('user')
    }
  })

  const login = (userData) => {
    user.value = userData
    isAuthenticated.value = true
  }

  const logout = () => {
    user.value = null
    isAuthenticated.value = false
    localStorage.removeItem('user')

    window.dispatchEvent(new Event('userChange'))
  }

  const updateProfile = (updatedData) => {
    if (user.value) {
      user.value = { ...user.value, ...updatedData }
    }
  }

  const getUserName = () => user.value?.name || 'Guest'
  const getUserEmail = () => user.value?.email || ''
  const getUserId = () => user.value?.uid || null

  loadUser()

  return {
    user,
    isAuthenticated,

    login,
    logout,
    updateProfile,
    loadUser,

    getUserName,
    getUserEmail,
    getUserId
  }
})
