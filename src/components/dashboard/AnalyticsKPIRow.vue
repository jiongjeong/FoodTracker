<template>
  <div class="row g-3 mt-3 border-top">
    <!-- Total Waste -->
    <div class="col-6 col-xl-3">
      <div class="d-flex align-items-center">
        <div
          class="rounded-3 d-flex justify-content-center align-items-center flex-shrink-0 me-3"
          style="width: 48px; height: 48px; background-color: rgba(239, 68, 68, 0.1); color: #ef4444;"
        >
          <i class="bi bi-trash fs-5"></i>
        </div>
        <div class="flex-grow-1 min-w-0">
          <div class="text-muted small mb-1">Total Waste</div>
          <div class="fw-bold h6 mb-0">${{ analytics.totalWaste.money.toFixed(2) }}</div>
          <small class="text-muted">{{ analytics.totalWaste.items }} items</small>
        </div>
      </div>
    </div>

    <!-- Total Saved -->
    <div class="col-6 col-xl-3">
      <div class="d-flex align-items-center">
        <div
          class="rounded-3 d-flex justify-content-center align-items-center flex-shrink-0 me-3"
          style="width: 48px; height: 48px; background-color: rgba(16, 185, 129, 0.1); color: #10b981;"
        >
          <i class="bi bi-bag-check fs-5"></i>
        </div>
        <div class="flex-grow-1 min-w-0">
          <div class="text-muted small mb-1">Total Saved</div>
          <div class="fw-bold h6 mb-0">${{ analytics.totalSaved.money.toFixed(2) }}</div>
          <small class="text-muted">{{ analytics.totalSaved.items }} items</small>
        </div>
      </div>
    </div>

    <!-- Reduction -->
    <div class="col-6 col-xl-3">
      <div class="d-flex align-items-center">
        <div
          class="rounded-3 d-flex justify-content-center align-items-center flex-shrink-0 me-3"
          style="width: 48px; height: 48px; background-color: rgba(37, 99, 235, 0.1); color: #2563eb;"
        >
          <i class="bi bi-graph-down-arrow fs-5"></i>
        </div>
        <div class="flex-grow-1 min-w-0">
          <div class="text-muted small mb-1">Reduction</div>
          <div class="fw-bold h6 mb-0">{{ analytics.reduction }}%</div>
          <small class="text-muted">waste reduction</small>
        </div>
      </div>
    </div>

    <!-- Inventory -->
    <div class="col-6 col-xl-3">
      <div class="d-flex align-items-center">
        <div
          class="rounded-3 d-flex justify-content-center align-items-center flex-shrink-0 me-3"
          style="width: 48px; height: 48px; background-color: rgba(249, 115, 22, 0.1); color: #f97316;"
        >
          <i class="bi bi-box-seam fs-5"></i>
        </div>
        <div class="flex-grow-1 min-w-0">
          <div class="text-muted small mb-1">Inventory</div>
          <div class="fw-bold h6 mb-0">${{ analytics.inventory.value.toFixed(2) }}</div>
          <small class="text-muted">{{ analytics.inventory.items }} items</small>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  analytics: {
    type: Object,
    required: true
  }
})
</script>
