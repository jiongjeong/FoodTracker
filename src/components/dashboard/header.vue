<!-- src/components/DashboardHeader.vue -->
<template>
  <section class="dashboard-hero">
    <!-- Decorative Background Blobs -->
    <div class="position-absolute top-0 end-0 h-100 w-50 dashboard-blobs" style="z-index: 0; pointer-events: none;">
      <!-- Top green blob -->
      <div 
        class="position-absolute top-0 end-0 rounded-circle bg-success bg-gradient opacity-75 shadow"
        style="width: 350px; height: 350px; background: radial-gradient(circle at 30% 30%, #10b981, #059669); transform: translate(20%, -20%);">
      </div>

      <!-- Bottom blue blob -->
      <div 
        class="position-absolute bottom-0 end-0 rounded-circle bg-info bg-gradient opacity-75 shadow"
        style="width: 280px; height: 280px; background: radial-gradient(circle at 70% 70%, #06b6d4, #0891b2); transform: translate(20%, 20%); z-index: 0;">
      </div>
    </div>

    <!-- Floating Elements -->
    <div class="floating-element position-absolute" 
         style="top: 55%; left: 40%; font-size: 2rem; animation-delay: 0s;">📊</div>
    
    <div class="floating-element position-absolute" 
         style="top: 15%; left: 48%; font-size: 1.8rem; animation-delay: 1s;">📈</div>
    
    <div class="floating-element position-absolute" 
         style="top: 10%; left: 54%; font-size: 1.6rem; animation-delay: 2s;">💚</div>
    
    <div class="floating-element position-absolute" 
         style="top: 57%; left: 50%; font-size: 1.5rem; animation-delay: 3s;">🌱</div>

    <div class="container-fluid px-4 h-100">
      <div class="row g-4 w-100">
        <!-- Title Section - Full Width -->
        <div class="col-12 text-center text-md-start position-relative" style="z-index: 10; padding-top: 2rem;">
          <h1 class="hero-title mb-2">Your Dashboard</h1>
          <p class="hero-subtitle mb-0">
            <i class="bi bi-leaf me-2"></i>
            Track your impact, stats, and food inventory 🌿
          </p>
        </div>

        <!-- Content Row: Cards on Left, Graph on Right -->
        <div class="col-12">
          <div class="row align-items-center g-4">
            <!-- Left: Quick Stats Cards -->
            <div class="col-12 col-lg-7 position-relative" style="z-index: 10;">
              <div class="row g-3">
              <div class="col-6 col-lg-6">
                <StatCard
                  title="Food Score"
                  iconClass="bi bi-graph-up-arrow"
                  :gradient="`linear-gradient(135deg, rgba(0, 102, 60, 0.85) 0%, rgba(50, 200, 120, 0.75) 100%)`"
                  height="130px"
                >
                  <template #default>
                    <h3 class="fw-bold mb-0 text-white">{{ userFoodScore }}</h3>
                    <small class="text-white">points</small>

                    <div v-if="analytics.streakDays > 0" class="mt-2">
                      <span
                        class="streak-fire"
                        :class="{
                          'fire-small': analytics.streakDays < 7,
                          'fire-medium': analytics.streakDays >= 7 && analytics.streakDays < 14,
                          'fire-large': analytics.streakDays >= 14
                        }"
                      >🔥</span>
                      <span class="streak-text text-white">
                        {{ analytics.streakDays }} day{{ analytics.streakDays !== 1 ? 's' : '' }}
                      </span>
                    </div>
                  </template>

                  <template #back>
                    <p class="mb-0 text-white small text-center mt-2" style="font-size:10px">
                      Rewards when food is consumed and money saved,
                      penalizes waste, and adds bonus points for food donations
                    </p>
                  </template>
                </StatCard>
              </div>

              <div class="col-6 col-lg-6">
                <StatCard
                  title="Expiring Soon"
                  iconClass="bi bi-exclamation-triangle"
                  gradient="linear-gradient(135deg, rgba(0, 74, 173, 0.85) 0%, rgba(59, 130, 246, 0.75) 100%)"
                >
                  <h3 class="fw-bold mb-0 text-white">{{ expiringSoon }}</h3>
                  <small class="text-white">items</small>
                </StatCard>
              </div>

              <div class="col-6 col-lg-6">
                <StatCard
                  title="Potential Loss"
                  iconClass="bi bi-currency-dollar"
                  :gradient="`linear-gradient(135deg, rgba(153, 27, 27, 0.85) 0%, rgba(239, 68, 68, 0.75) 100%)`"
                  height="130px"
                >
                  <template #default>
                    <h3 class="fw-bold mb-0 text-white">${{ potentialLoss.toFixed(2) }}</h3>
                    <small class="text-white">if expired</small>
                  </template>

                  <template #back>
                    <p class="mb-0 text-white small text-center mt-3 mt-md-4" style="font-size:10px">
                      Measures the total value of food that's at risk of expiring within the next 7 days.
                    </p>
                  </template>
                </StatCard>
              </div>

              <div class="col-6 col-lg-6">
                <StatCard
                  title="Expired"
                  iconClass="bi bi-calendar-x"
                  gradient="linear-gradient(135deg, rgba(202, 84, 0, 0.85) 0%, rgba(249, 115, 22, 0.75) 100%)"
                >
                  <h3 class="fw-bold mb-0 text-white">{{ expired }}</h3>
                  <small class="text-white">items</small>
                </StatCard>
              </div>
            </div>

            <!-- Collapse Toggle Button - Below Cards -->
            <div class="text-center mt-3">
              <button 
                @click="$emit('toggle-overview')" 
                :aria-expanded="overviewCollapsed"
                class="btn btn-collapse d-flex align-items-center justify-content-center gap-2 mx-auto"
              >
                <i :class="overviewCollapsed ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"></i>
                <span class="d-none d-sm-inline">{{ overviewCollapsed ? 'Hide' : 'Show' }} Details</span>
                <span class="d-inline d-sm-none">{{ overviewCollapsed ? 'Hide' : 'Show' }}</span>
              </button>
            </div>
          </div>

          <!-- Right: Animated Graph (Desktop only) -->
          <div class="col-12 col-lg-5 d-none d-lg-flex justify-content-center align-items-center position-relative" style="z-index: 5; min-height: 400px;">
            <div class="position-relative" style="width: 320px; height: 320px;">
              <!-- Main Graph Rounded Square with Pulse -->
              <div class="position-relative rounded-4 shadow-lg overflow-hidden d-flex align-items-center justify-content-center graph-circle" style="width: 320px; height: 320px; background: linear-gradient(135deg, rgba(0, 184, 148, 0.15) 0%, rgba(0, 206, 201, 0.15) 100%); border: 3px solid rgba(0, 184, 148, 0.3);">
                <!-- Animated SVG Graph -->
                <svg width="280" height="280" viewBox="0 0 280 280" class="graph-svg">
                  <!-- Grid lines -->
                  <line x1="40" y1="40" x2="40" y2="240" stroke="rgba(0, 184, 148, 0.2)" stroke-width="2"/>
                  <line x1="40" y1="240" x2="240" y2="240" stroke="rgba(0, 184, 148, 0.2)" stroke-width="2"/>
                  
                  <!-- Animated growing bars -->
                  <rect x="60" y="240" width="30" height="60" fill="url(#barGradient1)" class="graph-bar" style="animation-delay: 0.2s;">
                    <animate attributeName="height" from="0" to="60" dur="1.5s" fill="freeze" repeatCount="1"/>
                    <animate attributeName="y" from="240" to="180" dur="1.5s" fill="freeze" repeatCount="1"/>
                  </rect>
                  
                  <rect x="110" y="240" width="30" height="100" fill="url(#barGradient2)" class="graph-bar" style="animation-delay: 0.4s;">
                    <animate attributeName="height" from="0" to="100" dur="1.5s" fill="freeze" repeatCount="1"/>
                    <animate attributeName="y" from="240" to="140" dur="1.5s" fill="freeze" repeatCount="1"/>
                  </rect>
                  
                  <rect x="160" y="240" width="30" height="140" fill="url(#barGradient3)" class="graph-bar" style="animation-delay: 0.6s;">
                    <animate attributeName="height" from="0" to="140" dur="1.5s" fill="freeze" repeatCount="1"/>
                    <animate attributeName="y" from="240" to="100" dur="1.5s" fill="freeze" repeatCount="1"/>
                  </rect>
                  
                  <rect x="210" y="240" width="30" height="80" fill="url(#barGradient4)" class="graph-bar" style="animation-delay: 0.8s;">
                    <animate attributeName="height" from="0" to="80" dur="1.5s" fill="freeze" repeatCount="1"/>
                    <animate attributeName="y" from="240" to="160" dur="1.5s" fill="freeze" repeatCount="1"/>
                  </rect>
                  
                  <!-- Animated line graph -->
                  <polyline
                    points="60,200 110,160 160,120 210,180"
                    fill="none"
                    stroke="rgba(0, 184, 148, 0.6)"
                    stroke-width="3"
                    stroke-linecap="round"
                    class="graph-line"
                  />
                  
                  <!-- Gradient definitions -->
                  <defs>
                    <linearGradient id="barGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style="stop-color:rgba(0, 184, 148, 0.8);stop-opacity:1" />
                      <stop offset="100%" style="stop-color:rgba(0, 206, 201, 0.6);stop-opacity:1" />
                    </linearGradient>
                    <linearGradient id="barGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style="stop-color:rgba(0, 184, 148, 0.9);stop-opacity:1" />
                      <stop offset="100%" style="stop-color:rgba(0, 206, 201, 0.7);stop-opacity:1" />
                    </linearGradient>
                    <linearGradient id="barGradient3" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style="stop-color:rgba(0, 184, 148, 1);stop-opacity:1" />
                      <stop offset="100%" style="stop-color:rgba(0, 206, 201, 0.8);stop-opacity:1" />
                    </linearGradient>
                    <linearGradient id="barGradient4" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style="stop-color:rgba(0, 184, 148, 0.85);stop-opacity:1" />
                      <stop offset="100%" style="stop-color:rgba(0, 206, 201, 0.65);stop-opacity:1" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              
              <!-- Floating data elements around the graph -->
              <div class="floating-data position-absolute" style="top: -10%; left: 10%; font-size: 1.8rem; animation-delay: 0s;">💹</div>
              <div class="floating-data position-absolute" style="top: 20%; right: -10%; font-size: 1.5rem; animation-delay: 1.5s;">📊</div>
              <div class="floating-data position-absolute" style="bottom: 10%; left: -5%; font-size: 1.6rem; animation-delay: 2.5s;">📉</div>
              <div class="floating-data position-absolute" style="bottom: -5%; right: 15%; font-size: 1.4rem; animation-delay: 3.5s;">💰</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  </section>
</template>

<script setup>
import StatCard from '@/components/dashboard/StatCard.vue'

const props = defineProps({
  userFoodScore: {
    type: Number,
    default: 0
  },
  expiringSoon: {
    type: Number,
    default: 0
  },
  potentialLoss: {
    type: Number,
    default: 0
  },
  expired: {
    type: Number,
    default: 0
  },
  analytics: {
    type: Object,
    default: () => ({ streakDays: 0 })
  },
  overviewCollapsed: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle-overview'])
</script>

<style scoped>
/* === FULL-SCREEN HERO === */
.dashboard-hero {
  background: #faf8f5;
  position: relative;
  color: #2d3436;
  overflow: hidden;
  margin: -1rem 0 2rem 0;
  min-height: 600px;
  display: flex;
  align-items: center;
  padding: 80px 0 40px 0;
}

/* === FLOATING ANIMATIONS === */
@keyframes riseAndFloat {
  0% {
    transform: translateY(0) scale(0.6);
    opacity: 0;
  }
  20% {
    opacity: 1;
    transform: translateY(-10px) scale(1);
  }
  50% {
    transform: translateY(-25px) scale(1.1);
  }
  80% {
    opacity: 0.8;
    transform: translateY(-40px) scale(1.05);
  }
  100% {
    transform: translateY(-60px) scale(1);
    opacity: 0;
  }
}

.floating-element {
  animation: riseAndFloat 4s ease-in-out infinite;
  pointer-events: none;
  transform-origin: center;
  z-index: 1;
}

.floating-data {
  animation: riseAndFloat 5s ease-in-out infinite;
  pointer-events: none;
  transform-origin: center;
  z-index: 2;
}

/* === GRAPH ANIMATIONS === */
.graph-circle {
  /* No animation - static container */
  box-shadow: 0 8px 24px rgba(0, 184, 148, 0.15);
}

.graph-line {
  stroke-dasharray: 400;
  stroke-dashoffset: 400;
  animation: drawLine 2s ease-in-out forwards;
  animation-delay: 1s;
}

@keyframes drawLine {
  0% {
    stroke-dashoffset: 400;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

.graph-bar {
  transform-origin: bottom;
  /* No fluctuate animation - bars stay solid after growing */
}

/* === CONTENT === */
.hero-content {
  position: relative;
  z-index: 2;
}

/* Header Wrapper - Desktop: flex row, Mobile: flex column */
.header-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.title-section {
  flex: 1;
  min-width: 0;
}

/* Title & Subtitle */
.hero-title {
  font-size: 3rem;
  font-weight: 900;
  color: #2d3436;
  margin: 0;
  letter-spacing: -0.5px;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: #636e72;
  font-weight: 500;
  max-width: 600px;
}

/* Collapse Button */
.btn-collapse {
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
  border: none;
  color: white;
  padding: 0.75rem 1.25rem;
  border-radius: 50px;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 184, 148, 0.25);
  flex-shrink: 0;
}

.btn-collapse:hover {
  background: linear-gradient(135deg, #00a885 0%, #00bfb8 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 184, 148, 0.35);
  color: white;
}

.btn-collapse i {
  font-size: 1.1rem;
  transition: transform 0.3s ease;
}

.btn-collapse:hover i {
  transform: scale(1.1);
}

/* Streak Styling */
.streak-fire {
  display: inline-block;
  font-size: 1rem;
  line-height: 1;
  animation: fireFlicker 1.5s ease-in-out infinite;
}

.streak-fire.fire-small {
  font-size: 1rem;
  animation-duration: 2s;
}

.streak-fire.fire-medium {
  font-size: 1.2rem;
  animation-duration: 1.2s;
  filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.6));
}

.streak-fire.fire-large {
  font-size: 1.4rem;
  animation-duration: 0.8s;
  filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.8));
}

@keyframes fireFlicker {
  0%, 100% {
    transform: scale(1) rotate(-2deg);
  }
  25% {
    transform: scale(1.1) rotate(2deg);
  }
  50% {
    transform: scale(0.95) rotate(-1deg);
  }
  75% {
    transform: scale(1.05) rotate(1deg);
  }
}

.streak-text {
  font-weight: 600;
}

/* Ensure blobs sit behind content on small screens */
.dashboard-blobs {
  position: absolute;
  z-index: 0;
  pointer-events: none;
}

@media (max-width: 575px) {
  .dashboard-blobs,
  .dashboard-blobs > div {
    z-index: 0 !important;
    pointer-events: none !important;
  }
}

/* === RESPONSIVE === */
@media (max-width: 991.98px) {
  .dashboard-hero {
    padding: 70px 0 40px 0;
    min-height: 550px;
  }
  
  .hero-title { 
    font-size: 2.5rem; 
  }
  
  .btn-collapse {
    font-size: 0.9rem;
    padding: 0.65rem 1rem;
  }
}

@media (max-width: 767.98px) {
  .dashboard-hero {
    min-height: 620px;
    padding: 80px 0 40px 0;
  }
  
  .hero-title { 
    font-size: 2.2rem; 
  }
  
  .hero-subtitle { 
    font-size: 1.1rem;
    margin-left: auto;
    margin-right: auto;
  }
}

@media (max-width: 575.98px) {
  .dashboard-hero {
    min-height: 600px;
    padding: 70px 0 40px 0;
  }
  
  .hero-title {
    font-size: 1.8rem;
  }
  
  .hero-subtitle {
    font-size: 1rem;
  }
  
  .btn-collapse {
    max-width: 240px;
    font-size: 0.85rem;
    padding: 0.6rem 1rem;
  }
}
</style>