import { createRouter, createWebHistory } from 'vue-router'

import DashboardView from '../views/DashboardView.vue'
import RecipesView from '../views/RecipesView.vue'
import ChatbotView from '../views/ChatbotView.vue'
import CommunityView from '../views/CommunityView.vue'
import AnalyticsView from '../views/AnalyticsView.vue'
import LeaderboardView from '../views/LeaderboardView.vue'
import SignupView from '../views/SignupView.vue'
import LoginView from '../views/LoginView.vue'
import ProfileView from '../views/ProfileView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/dashboard', component: DashboardView },
    { path: '/', component: DashboardView },
    { path: '/recipes', component: RecipesView },
    { path: '/chat', component: ChatbotView },
    { path: '/community', component: CommunityView },
    { path: '/analytics', component: AnalyticsView },
    { path: '/leaderboard', component: LeaderboardView },
    { path: '/signup', name: 'signup', component: SignupView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/profile', name: 'profile', component: ProfileView },
  ],
})

export default router
