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

let authReady = false
const authReadyPromise = new Promise((resolve) => {
  const unsubscribe = auth.onAuthStateChanged(() => {
    authReady = true
    unsubscribe()
    resolve()
  })
})

router.beforeEach(async (to, from, next) => {
  if (!authReady) {
    await authReadyPromise
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const currentUser = auth.currentUser

  if (requiresAuth) {
    if (currentUser) {
      next()
    } else {
      next('/login')
    }
    return
  }

  if (currentUser) {
    if (['landing', 'login', 'signup'].includes(to.name)) {
      next('/dashboard')
      return
    }
  }

  next()
})

export default router
