<script>
import { db } from '../firebase.js'; // adjust path as needed
import { collection, getDocs } from 'firebase/firestore';
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
  methods: {
    formatDate(dateObj) {
      const date = dateObj instanceof Date ? dateObj : dateObj.toDate();
      const day = String(date.getDate()).padStart(2, '0');
      const month = date.toLocaleString('en-US', { month: 'short' });
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    },
    getFoodCardClass(food) {
      const now = new Date();
      const expDate = food.expirationDate.toDate();
      const daysLeft = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
      if (expDate < now) {
        return 'expired-card';
      } else if (daysLeft >= 1 && daysLeft <= 7) {
        return 'warning-card';
      } else {
        return 'normal-card';
      }
    },
    getDaysLeft(food) {
      const now = new Date();
      const expDate = food.expirationDate.toDate();
      const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const expMidnight = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
      return Math.floor((expMidnight - nowMidnight) / (1000 * 60 * 60 * 24));
    },
    getBadgeClass(food) {
      const daysLeft = this.getDaysLeft(food);

      if (daysLeft < 0 || daysLeft === 0 || daysLeft === 1) {
        return 'badge-expired';
      } else if (daysLeft >= 2 && daysLeft <= 7) {
        return 'badge-warning';
      } else {
        return 'badge-transparent';
      }
    }
  }

};


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
  <div class="food-scroll-container">
    <div class="food-scroll-section">
      <div v-for="food in food_inv" :key="food.id" class="food-card" :class="getFoodCardClass(food)">
        <div class="food-header">
          <div>
            <div class="food-title-group">
              <span class="food-name">{{ food.name }}</span>
              <span class="expired-badge" :class="getBadgeClass(food)">
                <span v-if="getDaysLeft(food) < 0">Expired</span>
                <span v-else-if="getDaysLeft(food) == 0">Today</span>
                <span v-else>{{ getDaysLeft(food) }} days</span>
              </span>
            </div>
            <div class="food-category">{{ food.category }}</div>
            <div class="food-expiry">Expires: {{ formatDate(food.expirationDate) }}</div>
          </div>
          <div class="food-right">
            <div class="food-price">${{ food.price }}</div>
            <div class="food-quantity">{{ food.quantity }} {{ food.unit }}</div>
            
          </div>
        </div>
        <div class="food-actions">
          <button class="food-btn food-btn-edit"><i class="bi bi-pencil"></i> Edit</button>
          <button class="food-btn food-btn-use"><i class="bi bi-check2"></i> Use</button>
          <button class="food-btn food-btn-delete"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    </div>
  </div>

  

</template>
<style scoped>
.food-scroll-container {
  max-width: 700px;
  margin: 0 auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 16px;
}

.food-scroll-section {
  max-height: 500px;
  overflow-y: auto;
  padding: 8px;
}

.food-card {
  margin-bottom: 16px;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.expired-card {
  background: #f5dcdc;
}

.warning-card {
  background: #fff9c4;
}

.normal-card {
  background: #fff;
}

.expired-badge {
  border-radius: 6px;
  padding: 2px 10px;
  font-weight: bold;
  transition: background 0.2s, color 0.2s;
}

.badge-expired {
  background: #e53935;
  color: #fff;
}

.badge-warning {
  background-color: #ff9800;
  color: #fff;
}

.badge-transparent {
  background: #ede9e8;
  color: #333;
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

.sub-details {
  margin-top: 8px;
  display: flex;
  gap: 16px;
  font-size: 0.9rem;
  color: #555;
}

.food-name {
  font-size: 1.5rem;
  font-weight: bold;
}

.food-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.food-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 16px;
}

.food-btn {
  border: none;
  background: #f5f5f5;
  color: #333;
  padding: 6px 16px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.2s, color 0.2s;
}
.food-btn-edit {
  background: #e0e0e0;
}
.food-btn-use {
  background: #e8f5e9;
  color: #388e3c;
}
.food-btn-delete {
  background: #ffebee;
  color: #e53935;
}
.food-btn:hover {
  filter: brightness(0.95);
}

.food-price {
  font-size: 1.3rem;
  font-weight: bold;
  margin-left: 16px;
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
