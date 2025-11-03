<template>
  <div class="card shadow-sm h-100 position-relative overflow-visible leaderboard-card">
    <div class="card-body text-center pt-4">
      <!-- Icon Circle -->
      <div
        class="d-flex align-items-center justify-content-center mx-auto mb-3 rounded-circle icon-circle-hover"
        style="width: 80px; height: 80px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #f59e0b; transition: all 0.3s ease;"
      >
        <i class="bi bi-trophy fs-1"></i>
      </div>

      <!-- Title -->
      <h6 class="fw-bold mb-3 title-hover" style="font-size: 1.25rem; transition: color 0.3s ease;">
        Leaderboard Insights
      </h6>

      <!-- Description -->
      <p class="text-secondary small mb-0 lh-base">
        {{ message }}
      </p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  message: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.leaderboard-card {
  transition: all 0.3s ease;
  border: 1px solid white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
}

.leaderboard-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15), 0 10px 10px rgba(0, 0, 0, 0.04);
  border: 1px solid #f59e0b;
}

.leaderboard-card:hover .icon-circle-hover {
  transform: scale(1.1);
  background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%);
}

.leaderboard-card:hover .title-hover {
  color: #f59e0b;
}

.overflow-visible {
  overflow: visible;
}
</style>
