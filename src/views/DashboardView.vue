<script setup>

import { ref, computed } from 'vue'
const searchText = ref('')
const selectedCategory = ref('All Categories')
const sortBy = ref('expiration')
const sortDirection = ref('asc')

const categories = [
  'All Categories',
  'Fruits & Vegetables',
  'Dairy & Eggs',
  'Meat & Poultry',
  'Bakery',
  'Snacks',
  'Beverages',
  'Condiments & Sauces',
  'Frozen Foods',
  'Grains & Pasta',
  'Other'
]

const toggleSortDirection = () => {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
}
const getSortButtonIcon = computed(() => {
  return sortDirection.value === 'asc' ? 'bi bi-sort-up' : 'bi bi-sort-down'
})
const getSortButtonTitle = computed(() => {
  const direction = sortDirection.value === 'asc' ? 'Ascending' : 'Descending'
  return `Sort ${direction}`
})

</script>
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
      <div class="row g-4">
          <div class="col-lg-8">
            <div class="glass-card p-4">
              <div class="d-flex align-items-center gap-2 mb-4">
                <i class="bi bi-search"></i>
                <h2 class="h4 mb-0">Food Inventory</h2>
              </div>
              <div class="row g-2 mb-3">
                 <div class="col-12 col-md-4">
                  <input
                    v-model="searchText"
                    type="text"
                    class="form-control"
                    placeholder="Search food items..."
                 />
                 </div>
                 <div class="col-12 col-sm-6 col-md-3">
                   <select v-model="selectedCategory" class="form-select">
                    <option v-for="cat in categories" v-bind:key="cat" v-bind:value="cat">{{ cat }}</option>
                  </select>
                 </div>
                 <div class="col-9 col-sm-4 col-md-3">
                  <select v-model="sortBy" class="form-select">
                    <option value="expiration">Expiration Date</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="category">Category</option>
                    <option value="quantity">Quantity (High-Low)</option>
                    <option value="price">Price (High-Low)</option>
                  </select>
                 </div>
                 <div class="col-3 col-sm-2 col-md-2">
                  <button v-on:click="toggleSortDirection"
                  class = "btn btn-outline-secondary sort-direction-btn w-100"
                  :title="getSortButtonTitle"
                  >
                  <i :class="getSortButtonIcon"></i>
                </button>
                 </div>
              </div>
            </div>
          </div>
        </div>
  </div>
    
</template>
<style scoped>
.dashboard-overview {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.08) 100%);
  border: 1px solid rgba(16, 185, 129, 0.1);
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.08);
  border-radius: 1rem;
  position: relative;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.dashboard-overview::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #059669 0%, #10b981 50%, #34d399 100%);
  border-radius: 1rem 1rem 0 0;
}

.sort-direction-btn {
  min-width: 42px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.sort-direction-btn i {
  font-size: 16px;
  line-height: 1;
}
</style>