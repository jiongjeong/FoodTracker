<script>
import { db } from '../firebase.js'; // adjust path as needed
import { collection, getDocs } from 'firebase/firestore';

export default {
  data() {
    return {
      food_inv: [],
    };
  },
  async mounted() {
    const querySnapshot = await getDocs(collection(db, 'food'));
    this.food_inv = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // console.log(this.food_inv)
  },
};


</script>

<style scoped>
.food-scroll-container {
  max-width: 700px;
  margin: 0 auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  padding: 16px;
}
.food-scroll-section {
  max-height: 500px;
  overflow-y: auto;
  padding: 8px;
}
.food-card {
  margin-bottom: 16px;
  background: #f5dcdc;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.food-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.food-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.food-name {
  font-size: 1.5rem;
  font-weight: bold;
}
.expired-badge {
  background: #e53935;
  color: #fff;
  border-radius: 6px;
  padding: 2px 10px;
  font-weight: bold;
}
.food-price {
  font-size: 1.3rem;
  font-weight: bold;
  margin-left: 16px;
}
</style>
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

<div class="food-scroll-container">
  <div class="food-scroll-section">
    <div v-for="food in food_inv" :key="food.id" class="food-card">
      <div class="food-header">
        <div class="food-title-group">
          <span class="food-name">{{ food.name }}</span>
          <span v-if="food.expired" class="expired-badge">Expired</span>
        </div>
        <span class="food-price">${{ food.price }}</span>
      </div>
      <div class="food-category">{{ food.category }}</div>
      <div class="food-quantity">{{ food.quantity }} {{ food.unit }}</div>
      <div class="food-expiry">Expires: {{ food.expiry }}</div>
      <!-- Add your Edit, Use, Delete buttons here -->
    </div>
  </div>
</div>

<!-- hard coded  -->
  <!-- <div class="food-scroll-section">
    <div class="food-card">
      <div class="food-header">
        <div class="food-title-group">
          <span class="food-name">Bagels</span>
          <span class="expired-badge">Expired</span>
        </div>
        <span class="food-price">$3.99</span>
      </div>
      <div class="food-category">Bakery</div>
      <div class="food-quantity">6 pieces</div>
      <div class="food-expiry">Expires: 4 Oct 2025</div>
    </div>
  </div> -->

</template>