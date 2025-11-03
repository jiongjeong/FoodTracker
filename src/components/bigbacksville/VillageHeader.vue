<template>
  <header class="village-header d-flex align-items-center justify-content-between m-auto py-5">
    <div class="container">
      <div class="row justify-content-center align-items-center text-center text-md-start g-4">
        <div class="col-12 col-md-7 order-2 order-md-2 d-flex justify-content-center align-items-center">
          <PodiumLeaderboard/>
        </div>

        <!-- Side Section: Title + Monkey Selector -->
        <div class="col-12 col-md-5 order-1 order-md-1 d-flex flex-column align-items-center align-items-md-start">
          <!-- Title Section -->
          <div class="title-section w-100 mb-4">
            <!-- Trophy Centered -->
            <div class="d-flex justify-content-center mb-3">
              <div class="icon-wrapper">
                <i class="bi bi-trophy-fill"></i>
              </div>
            </div>

            <!-- Text Left-Aligned (on md+) -->
            <div class="text-center text-center-md">
              <h1 class="page-title mb-2">BigBacksVille</h1>
              <p class="page-subtitle">
                <i class="bi bi-leaf me-1"></i> Earn Food Points, Unlock Monkeys, and Climb the Leaderboard!
              </p>
            </div>
          </div>

          <!-- Carousel -->
          <div class="carousel-section w-100">
            <MonkeyAvatarSelector />
          </div>
        </div>

      </div>
    </div>
  </header>
</template>

<script setup>
import MonkeyAvatarSelector from '@/components/bigbacksville/MonkeyAvatarSelector.vue'
import PodiumLeaderboard from '@/components/bigbacksville/PodiumLeaderboard.vue'
</script>

<style scoped>
.village-header {
  min-height: 100vh;
  background: linear-gradient(rgba(255, 255, 255, 0.85), rgba(248, 250, 252, 0.4)),
              url('/public/monkeyvillage.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-bottom: 3px solid #fbbf24;
}

/* Trophy icon styling */
.icon-wrapper {
  width: 70px;
  height: 70px;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px rgba(251, 191, 36, 0.4);
}

.icon-wrapper i {
  font-size: 36px;
  color: #fff;
}

/* Title text */
.page-title {
  font-size: clamp(24px, 5vw, 48px);
  font-weight: 800;
  line-height: 1.2;
}

.page-subtitle {
  font-size: clamp(14px, 2vw, 18px);
}

/* Podium card styling */
.podium-card {
  max-width: 720px;
  border: 3px solid rgba(251, 191, 36, 0.5);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.podium-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 10px 30px rgba(251, 191, 36, 0.25);
}

@media (max-width: 767px) {
  .village-header {
    padding-top: 5rem;
    min-height: 100vh;
    padding-bottom: 5rem;
  }

  .podium-card {
    max-width: 100%;
  }

  .page-title {
    text-align: center;
  }

  .page-subtitle {
    text-align: center;
  }
}
</style>
