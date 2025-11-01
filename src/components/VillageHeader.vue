<template>
  <header class="village-header d-flex align-items-center py-3">
    <div class="container">
      <div class="row align-items-center flex-column flex-md-row">
        
        <!-- Left Section: Title + Monkey Carousel -->
        <div class="col-md-7 left-section mb-4 mb-md-0 text-center text-md-start">
          <!-- Title -->
          <div class="header-title d-flex flex-column flex-md-row align-items-center justify-content-center justify-content-md-start gap-3">
            <div class="icon-wrapper mb-2 mb-md-0">
              <i class="bi bi-trophy-fill fs-2"></i>
            </div>
            <div class="title-section">
              <h1 class="page-title fs-10 fs-md-5">Monkey Village</h1>
              <p class="page-subtitle fs-8 fs-md-5">
                <i class="bi bi-leaf"></i>
                Work together with fellow monkeys to climb the leaderboard!
              </p>
            </div>
          </div>

          <!-- Monkey Carousel below title -->
          <div class="carousel-section mx-auto" style="max-width: 100%;">
            <MonkeyAvatarSelector />
          </div>
        </div>

        <!-- Right Section: Podium -->
        <div class="col-md-5 right-section d-flex justify-content-center justify-content-md-end align-items-center">
          <div class="podium-wrapper w-100 text-center text-md-end" style="max-width: 500px;">
            <PodiumLeaderboard />
          </div>
        </div>

      </div>
    </div>
  </header>
</template>

<script setup>
import MonkeyAvatarSelector from '@/components/MonkeyAvatarSelector.vue'
import PodiumLeaderboard from '@/components/PodiumLeaderboard.vue'
</script>

<style scoped>
.village-header {
  position: relative;
  min-height: 100vh; /* ensures full-screen minimum */
  background: linear-gradient(rgba(255, 255, 255, 0.85), rgba(248, 250, 252, 0.4)), 
              url('/public/monkeyvillage.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-bottom: 3px solid #fbbf24;
  box-shadow: 0 2px 12px rgba(251, 191, 36, 0.15);
  overflow-y: auto;
  padding: 60px 0; /* vertical padding instead of fixed height */
  display: flex;
  align-items: center;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 64px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 48px;
  width: 100%;
}

/* ========== LEFT SECTION ========== */
.left-section {
  display: flex;
  flex-direction: column;
  gap: 32px;
  flex-shrink: 1; /* allow shrinking */
}

.header-title {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.icon-wrapper {
  width: clamp(50px, 10vw, 80px);
  height: clamp(50px, 10vw, 80px);
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(251, 191, 36, 0.4);
  transition: transform 0.3s ease;
  flex-shrink: 0;
}

.icon-wrapper:hover {
  transform: scale(1.05) rotate(5deg);
}

.icon-wrapper i {
  font-size: 42px;
  color: #fff;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.title-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.page-title {
  font-size: clamp(24px, 5vw, 56px); /* shrinks on smaller screens */
  font-weight: 800;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.1;
}

.page-subtitle {
  font-size: clamp(14px, 2vw, 18px);
  color: #10b981;
  margin: 0;
  font-weight: 600;
}

.page-subtitle i {
  font-size: 18px;
}

.carousel-section {
  width: 100%;
}

/* ========== RIGHT SECTION ========== */
.right-section {
  flex-shrink: 0;
}

.monkey-selector-row {
  justify-content: center; /* center avatars under title */
  flex-wrap: wrap;
}

.monkey-avatar-wrapper {
  width: 56px;   /* smaller border */
  height: 56px;
  border: 2px solid #fff;
}

.podium-wrapper {
  max-width: 500px;
}

</style>