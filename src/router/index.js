import { createRouter, createWebHistory } from 'vue-router'
import { auth } from '@/firebase'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('../views/LandingView.vue')
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue')
    },
    {
      path: '/signup',
      name: 'signup',
      component: () => import('../views/SignupView.vue')
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/recipes',
      name: 'recipes',
      component: () => import('../views/RecipesView.vue'),
      meta: { requiresAuth: true }
    },
    // {
    //   path: '/leaderboard',
    //   name: 'leaderboard',
    //   component: () => import('../views/LeaderboardView.vue'),
    //   meta: { requiresAuth: true }
    // },
    {
      path: '/community',
      name: 'community',
      component: () => import('../views/CommunityView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/chatbot',
      name: 'chatbot',
      component: () => import('../views/ChatbotView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/village',
      name: 'Village',
      component: () => import('../views/VillageView.vue')
    }
  ]
})

// Wait for auth to be ready before checking routes
let authReady = false
const authReadyPromise = new Promise((resolve) => {
  const unsubscribe = auth.onAuthStateChanged(() => {
    authReady = true
    unsubscribe()
    resolve()
  })
})

router.beforeEach(async (to, from, next) => {
  // Wait for Firebase Auth to initialize on first navigation
  if (!authReady) {
    await authReadyPromise
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const currentUser = auth.currentUser
  // If route requires auth, ensure user is authenticated
  if (requiresAuth) {
    if (currentUser) {
      next()
    } else {
      console.log('Not authenticated, redirecting to login')
      next('/login')
    }
    return
  }

  // Public routes: if user is already logged in, redirect them away from auth/landing pages
  if (currentUser) {
    // If visiting root landing page while authenticated, send to dashboard
    if (['landing', 'login', 'signup'].includes(to.name)) {
      next('/dashboard')
      return
    }
  }

  // Default allow
  next()
})

export default router
