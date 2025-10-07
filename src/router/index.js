import { createRouter, createWebHistory } from 'vue-router'
import AboutView from '../views/AboutView.vue'
import HomeView from '../views/HomeView.vue'
import DashboardView from '../views/DashboardView.vue'
import RecipesView from '../views/RecipesView.vue'
import ChatbotView from '../views/ChatbotView.vue'
import CommunityView from '../views/CommunityView.vue'
import AnalyticsView from '../views/AnalyticsView.vue'
import LeaderboardView from '../views/LeaderboardView.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // { path: '/',component: HomeView },
    { path: '/about', component: AboutView },
    { path: '/dashboard', component: DashboardView },
    { path: '/recipes', component: RecipesView },
    { path: '/chat', component: ChatbotView },
    { path: '/community', component: CommunityView },
    { path: '/analytics', component: AnalyticsView },
    { path: '/leaderboard', component: LeaderboardView },
    { path: '/', component: DashboardView },
    // { path: '/signup', name: 'signup', component: () => import('../views/Signup.vue')},
    // { path: '/login', name: 'login', component: () => import('../views/Login.vue')}
  ],
})

export default router
