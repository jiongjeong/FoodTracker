<template>

  <div class="container-fluid p-4">
    <div class="dashboard-overview">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h1 class="h2 mb-2">Dashboard</h1>
            <p class="text-muted mb-0">Track your food inventory and reduce waste</p>
          </div>
        </div>

        <div class="row g-3">
          <div class="col-6 col-lg-3">
            <div class="glass-card stat-card p-3">
              <div class="d-flex align-items-center gap-2 mb-2">
                <i class="bi bi-graph-up-arrow text-success"></i>
                <small class="text-muted">Food Score</small>
              </div>
              <!-- <h3 class="h4">{{ user.currentScore }}</h3> -->
              <h3 class="h4">placeholder</h3>
              <small class="text-muted">points</small>
            </div>
          </div>
        <div class="col-6 col-lg-3">
            <div class="glass-card stat-card p-3">
              <div class="d-flex align-items-center gap-2 mb-2">
                <i class="bi bi-exclamation-triangle text-warning"></i>
                <small class="text-muted">Expiring Soon</small>
              </div>
              <!-- <h3 class="h4">{{ expiringSoon }}</h3> -->
              <h3 class="h4">placeholder</h3>
              <small class="text-muted">items</small>
            </div>
          </div>

          <div class="col-6 col-lg-3">
            <div class="glass-card stat-card p-3">
              <div class="d-flex align-items-center gap-2 mb-2">
                <i class="bi bi-currency-dollar text-success"></i>
                <small class="text-muted">Potential Loss</small>
              </div>
              <!-- <h3 class="h4">${{ potentialLoss.toFixed(2) }}</h3> -->
              <h3 class="h4">placeholder</h3>
              <small class="text-muted">if expired</small>
            </div>
          </div>

          <div class="col-6 col-lg-3">
            <div class="glass-card stat-card p-3">
              <div class="d-flex align-items-center gap-2 mb-2">
                <i class="bi bi-calendar-x text-danger"></i>
                <small class="text-muted">Expired</small>
              </div>
              <!-- <h3 class="h4 text-danger">{{ expired }}</h3> -->
              <h3 class="h4 text-danger">placeholder</h3>
              <small class="text-muted">items</small>
            </div>
          </div>
        </div>
      </div>
  </div>
    
</template>