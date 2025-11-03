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

    <div class="container-fluid px-4 h-100">
      <div class="row g-4 w-100">
        <!-- Title Section - Full Width -->
        <div class="col-12 text-center text-md-start position-relative" style="z-index: 10; padding-top: 2rem;">
          <h1 class="hero-title mb-2">Hello, 
            <span class="text-success">
              {{ username }}
            </span>
          
          </h1>
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

          <!-- Right: Animated Graph Image (Desktop only) -->
          <div class="col-12 col-lg-5 d-none d-lg-flex justify-content-center align-items-center position-relative" style="z-index: 5; min-height: 400px;">
            <div class="position-relative graph-container" style="width: 320px; height: 320px;">
              <!-- Main Graph Image with Animation -->
              <div class="graph-image-wrapper">
                <img 
                  src="/graph-img.png" 
                  alt="Analytics Graph" 
                  class="graph-image"
                  style="width: 100%; height: 100%; object-fit: contain;"
                />
              </div>
              
              <!-- Floating emojis emanating from the graph -->
              <div class="floating-emoji emoji-1" style="top: 10%; left: 15%;">💹</div>
              <div class="floating-emoji emoji-2" style="top: 25%; right: 10%;">📊</div>
              <div class="floating-emoji emoji-3" style="bottom: 30%; left: 5%;">📈</div>
              <div class="floating-emoji emoji-5" style="top: 40%; left: -5%;">📉</div>
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
  },
  username: {
    type: String,
    default: 'User'
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

/* === GRAPH IMAGE ANIMATIONS === */
.graph-container {
  position: relative;
}

.graph-image-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: subtlePulse 3s ease-in-out infinite;
}

.graph-image {
  filter: drop-shadow(0 8px 24px rgba(0, 184, 148, 0.2));
  animation: floatGentle 4s ease-in-out infinite;
}

@keyframes subtlePulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

@keyframes floatGentle {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-8px) rotate(0.5deg);
  }
  50% {
    transform: translateY(-12px) rotate(-0.5deg);
  }
  75% {
    transform: translateY(-8px) rotate(0.5deg);
  }
}

/* Floating emojis from graph */
.floating-emoji {
  position: absolute;
  font-size: 1.6rem;
  pointer-events: none;
  animation: emojiPop 4s ease-in-out infinite;
  opacity: 0;
}

.emoji-1 {
  animation-delay: 0s;
}

.emoji-2 {
  animation-delay: 0.7s;
}

.emoji-3 {
  animation-delay: 1.4s;
}

.emoji-4 {
  animation-delay: 2.1s;
}

.emoji-5 {
  animation-delay: 2.8s;
}

.emoji-6 {
  animation-delay: 3.5s;
}

@keyframes emojiPop {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.3);
  }
  10% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
  30% {
    opacity: 0.8;
    transform: translate(calc(var(--x, 0) * 10px), calc(var(--y, 0) * -15px)) scale(1.1);
  }
  60% {
    opacity: 0.5;
    transform: translate(calc(var(--x, 0) * 20px), calc(var(--y, 0) * -30px)) scale(0.9) rotate(10deg);
  }
  100% {
    opacity: 0;
    transform: translate(calc(var(--x, 0) * 30px), calc(var(--y, 0) * -50px)) scale(0.5) rotate(20deg);
  }
}


/* === CONTENT === */
.hero-content {
  position: relative;
  z-index: 2;
}

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