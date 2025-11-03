<template>
  <section class="dashboard-hero">
    <div class="position-absolute top-0 start-0 w-100 h-100 dashboard-lines" style="z-index: 0; pointer-events: none; overflow: hidden;">
      <svg class="position-absolute w-100 h-100" style="top: 0; left: 0;" viewBox="0 0 1440 800" preserveAspectRatio="none">
        <path 
          d="M-100,200 Q400,100 800,250 T1600,200" 
          fill="none" 
          stroke="url(#greenGradient)" 
          stroke-width="3" 
          opacity="0.4"
        />
        <path 
          d="M-100,400 Q300,500 700,350 T1600,450" 
          fill="none" 
          stroke="url(#cyanGradient)" 
          stroke-width="3" 
          opacity="0.4"
        />
        <path 
          d="M-100,600 Q500,550 900,650 T1600,600" 
          fill="none" 
          stroke="url(#lightGreenGradient)" 
          stroke-width="2" 
          opacity="0.3"
        />
        
        <defs>
          <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#0891b2;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="lightGreenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#34d399;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#10b981;stop-opacity:1" />
          </linearGradient>
        </defs>
      </svg>
      
      <div class="position-absolute dashboard-dot" style="top: 15%; right: 20%; width: 8px; height: 8px; background: #10b981; border-radius: 50%; opacity: 0.5;"></div>
      <div class="position-absolute dashboard-dot" style="top: 45%; right: 15%; width: 6px; height: 6px; background: #06b6d4; border-radius: 50%; opacity: 0.4;"></div>
      <div class="position-absolute dashboard-dot" style="top: 70%; right: 25%; width: 10px; height: 10px; background: #34d399; border-radius: 50%; opacity: 0.3;"></div>
      <div class="position-absolute dashboard-dot" style="top: 30%; right: 8%; width: 7px; height: 7px; background: #059669; border-radius: 50%; opacity: 0.5;"></div>
    </div>

    <div class="container-fluid px-4 h-100">
      <div class="row align-items-center w-100 g-4">

       

        <div class="col-12 col-lg-5 text-center text-lg-start position-relative my-auto py-0" style="z-index: 10; padding-top: 2rem;justify-items: center;">

         

          <h1 class="hero-title mb-2">Hello,

            <span class="text-success">

              {{ username }}

            </span>

          </h1>

          <p class="hero-subtitle mb-0">

            <i class="bi bi-leaf me-2"></i>

            Track your impact, stats, and food inventory 🌿

          </p>

         

          <div class="floating-monkeys">

            <img src="/monkey/monkey1.png" alt="" class="floating-monkey monkey-1" />

            <img src="/monkey/monkey2.png" alt="" class="floating-monkey monkey-2" />

            <img src="/monkey/monkey3.png" alt="" class="floating-monkey monkey-3" />

            <img src="/monkey/monkey4.png" alt="" class="floating-monkey monkey-4" />

            <img src="/monkey/monkey5.png" alt="" class="floating-monkey monkey-5" />

          </div>

        </div>



        <div class="col-12 col-lg-7 position-relative" style="z-index: 10; padding-top: 2rem;">
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
      </div>
    </div>
    </section>
</template>

<script setup>
// ... (Keep the script section as is)
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
/* ... (Keep CSS before Floating Monkeys as is) ... */

/* === FULL-SCREEN HERO === */
.dashboard-hero {
  background: #faf8f5;
  position: relative;
  color: #2d3436;
  overflow: hidden;
  margin: -1rem 0 2rem 0;
  min-height: 300px;
  display: flex;
  align-items: center;
  padding: 30px 0 40px 0;
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

/* Ensure lines sit behind content */
.dashboard-lines {
  position: absolute;
  z-index: 0;
  pointer-events: none;
}

.dashboard-lines svg path {
  animation: dashFlow 20s linear infinite;
  stroke-dasharray: 10 5;
}

.dashboard-dot {
  animation: dotPulse 3s ease-in-out infinite;
}

@keyframes dashFlow {
  0% {
    stroke-dashoffset: 0;
  }
  100% {
    stroke-dashoffset: 100;
  }
}

@keyframes dotPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.5);
    opacity: 0.8;
  }
}

/* Floating Monkeys - 2 TOP, 3 BOTTOM */
.floating-monkeys {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1; /* Place behind the greeting text */
}

.floating-monkey {
  position: absolute;
  width: 60px;
  height: 60px;
  object-fit: contain;
  animation: monkeyFloat 6s ease-in-out infinite;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
}

/* === TOP MONKEYS (2) === */
/* Monkey 1 - Top Left */
.monkey-1 {
  top: -55%; /* Above the greeting */
  left: 15%;
  animation-delay: 0s;
}

/* Monkey 2 - Top Right */
.monkey-2 {
  top: -55%; /* Above the greeting */
  left: 75%;
  animation-delay: 1.2s;
}

/* === BOTTOM MONKEYS (3) === */
/* Monkey 3 - Bottom Left */
.monkey-3 {
  bottom: -65%; /* Below the greeting */
  left: 10%;
  animation-delay: 2.4s;
}

/* Monkey 4 - Bottom Center */
.monkey-4 {
  bottom: -80%; /* Below the greeting */
  left: 45%;
  animation-delay: 3.6s;
}

/* Monkey 5 - Bottom Right */
.monkey-5 {
  bottom: -65%; /* Below the greeting */
  left: 80%;
  animation-delay: 4.8s;
}

@keyframes monkeyFloat {
  0%, 100% {
    transform: translateY(0) translateX(0) rotate(-5deg);
    opacity: 0.7;
  }
  25% {
    transform: translateY(-15px) translateX(5px) rotate(0deg);
    opacity: 0.9;
  }
  50% {
    transform: translateY(-10px) translateX(-5px) rotate(5deg);
    opacity: 1;
  }
  75% {
    transform: translateY(-20px) translateX(3px) rotate(0deg);
    opacity: 0.9;
  }
}

/* Responsive adjustments */
@media (max-width: 575px) {
  .floating-monkey {
    width: 30px;
    height: 30px;
  }
  
  /* Hide 2 monkeys on mobile for cleaner look */
  .monkey-4,
  .monkey-5 {
    display: none;
  }
  
  /* Adjust remaining monkeys */
  .monkey-1 {
    top: -8%;
    left: 10%;
  }
  
  .monkey-2 {
    top: -10%;
    left: 70%;
  }
  
  .monkey-3 {
    bottom: -20%;
    left: 35%;
  }
}

@media (min-width: 576px) and (max-width: 991px) {
  .floating-monkey {
    width: 40px;
    height: 40px;
  }
  
  /* Adjust positions for tablets */
  .monkey-1 {
    top: -8%;
    left: 7%;
  }
  
  .monkey-2 {
    top: -12%;
    left: 88%;
  }
  
  .monkey-3 {
    bottom: -50%;
    left: 0%;
  }
  
  .monkey-4 {
    bottom: -50%;
    left: 42%;
  }
  
  .monkey-5 {
    bottom: -50%;
    left: 95%;
  }
}
</style>