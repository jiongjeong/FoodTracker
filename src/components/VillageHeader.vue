<!-- src/components/VillageHeader.vue -->
<template>
  <header class="village-header bg-dark text-white shadow-lg" style="z-index: 1100;">
    <div class="container-fluid px-4 py-3">
      <div class="d-flex align-items-center justify-content-between">
        <!-- Title -->
        <div class="d-flex align-items-center gap-3">
          <div class="icon-wrapper bg-warning rounded-circle d-flex align-items-center justify-content-center">
            <i class="bi bi-trophy-fill text-dark fs-4"></i>
          </div>
          <div>
            <h1 class="hero-title mb-0 fw-bold">Monkey Village</h1>
            <p class="hero-subtitle mb-0 text-muted small">
              <i class="bi bi-leaf me-1"></i>
              Explore & compete
            </p>
          </div>
        </div>

        <!-- Avatar Selector -->
        <MonkeyAvatarSelector />
      </div>
    </div>
  </header>
</template>

<script setup>
import MonkeyAvatarSelector from '@/components/MonkeyAvatarSelector.vue'
</script>

<style scoped>
.village-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 80px;
  border-bottom: 4px solid #FFD700;
}

.icon-wrapper {
  width: 50px;
  height: 50px;
  box-shadow: 0 0 16px rgba(255,215,0,0.4);
}

.hero-title {
  font-size: 1.6rem;
  color: #FFD700;
  text-shadow: 0 0 8px #000;
}

.hero-subtitle {
  font-size: 0.8rem;
}
</style>