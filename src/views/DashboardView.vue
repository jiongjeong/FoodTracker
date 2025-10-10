<script setup>
import { db } from '../firebase.js';
import { collection, getDocs, query, where, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, computed, onMounted, reactive } from 'vue'


const searchText = ref('')
const selectedCategory = ref('All Categories')
const sortBy = ref('expiration')
const sortDirection = ref('asc')
const user = JSON.parse(localStorage.getItem('user'))
const userId = JSON.parse(localStorage.getItem('user'))?.id
const showEditModal = ref(false)
const editForm = reactive({
  id: null,
  name: '',
  category: '',
  expirationDate: '',
  createdAt: '',
  price: '',
  quantity: '',
  unit: ''
})
const editFormOriginal = ref(null)

const foodItems = ref([])
const recipes = ref([])
const activities = ref([])

onMounted(async () => {
  if (user && userId) {
    // Fetch food subcollection
    const foodItemsRef = collection(db, 'user', userId, 'foodItems');
    const foodItemsSnapshot = await getDocs(foodItemsRef);
    foodItems.value = foodItemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Fetch recipes subcollection
    const recipesRef = collection(db, 'user', userId, 'recipes');
    const recipesSnapshot = await getDocs(recipesRef);
    recipes.value = recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Fetch activities subcollection
    const activityRef = collection(db, 'user', userId, 'activities');
    const activitySnapshot = await getDocs(activityRef);
    activities.value = activitySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
});

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

console.log('user id in dashboard:', userId);
console.log('user in dashboard:', user);
console.log(foodItems);
console.log(recipes);
console.log(activities);


const filteredFoodItems = computed(() => {
  const uniqueItems = foodItems.value.filter(
    (item, index, self) =>
      index === self.findIndex(i => i.id === item.id)
  )

  let items = [...uniqueItems]

  // Search
  if (searchText.value && searchText.value.trim()) {
    const searchTerm = searchText.value.toLowerCase().trim()
    items = items.filter(item =>
      item.name && item.name.toLowerCase().includes(searchTerm)
    )
  }

  // Category filter
  if (selectedCategory.value && selectedCategory.value !== 'All Categories') {
    items = items.filter(item => item.category === selectedCategory.value)
  }

  // Sorting
  const direction = sortDirection.value === 'desc' ? -1 : 1

  switch (sortBy.value) {
    case 'expiration':
      items.sort((a, b) => {
        const dateA = new Date(a.expirationDate?.toDate?.() || a.expirationDate)
        const dateB = new Date(b.expirationDate?.toDate?.() || b.expirationDate)
        if (isNaN(dateA) && isNaN(dateB)) return 0
        if (isNaN(dateA)) return 1
        if (isNaN(dateB)) return -1
        return (dateA - dateB) * direction
      })
      break

    case 'name':
      items.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase()
        const nameB = (b.name || '').toLowerCase()
        return nameA.localeCompare(nameB) * direction
      })
      break

    case 'category':
      items.sort((a, b) => {
        const catA = a.category || ''
        const catB = b.category || ''
        const categoryCompare = catA.localeCompare(catB) * direction
        if (categoryCompare !== 0) return categoryCompare
        const nameA = (a.name || '').toLowerCase()
        const nameB = (b.name || '').toLowerCase()
        return nameA.localeCompare(nameB)
      })
      break

    case 'quantity':
      items.sort((a, b) => {
        const qtyA = parseFloat(a.quantity) || 0
        const qtyB = parseFloat(b.quantity) || 0
        return (qtyB - qtyA) * direction
      })
      break

    case 'price':
      items.sort((a, b) => {
        const priceA = parseFloat(a.price) || 0
        const priceB = parseFloat(b.price) || 0
        return (priceB - priceA) * direction
      })
      break
  }

  return items
})

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

const formatDate = (dateObj) => {
  const date = dateObj instanceof Date ? dateObj : dateObj.toDate()
  const day = String(date.getDate()).padStart(2, '0')
  const month = date.toLocaleString('en-US', { month: 'short' })
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

const getDaysLeft = (food) => {
  const now = new Date()
  const expDate = food.expirationDate.toDate()
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const expMidnight = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate())
  return Math.floor((expMidnight - nowMidnight) / (1000 * 60 * 60 * 24))
}

const getFoodCardClass = (food) => {
  const now = new Date()
  const expDate = food.expirationDate.toDate()
  const daysLeft = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24))
  if (expDate < now) {
    return 'expired-card'
  } else if (daysLeft >= 1 && daysLeft <= 7) {
    return 'warning-card'
  } else {
    return 'normal-card'
  }
}

const getBadgeClass = (food) => {
  const daysLeft = getDaysLeft(food)
  if (daysLeft <= 1) {
    return 'badge-expired'
  } else if (daysLeft <= 7) {
    return 'badge-warning'
  } else {
    return 'badge-transparent'
  }
}

const expiringSoon = computed(() => {
  return foodItems.value.filter(food => {
    const daysLeft = getDaysLeft(food)
    return daysLeft >= 0 && daysLeft <= 5
  }).length
})

const expired = computed(() => {
  return foodItems.value.filter(food => {
    const daysLeft = getDaysLeft(food)
    return daysLeft < 0
  }).length
})

const potentialLoss = computed(() =>
  foodItems.value
    .filter(item => {
      const days = getDaysLeft(item)
      return days >= 0 && days <= 7
    })
    .reduce((sum, item) => sum + (item.price || 0), 0)
)

const toInputDateString = (d) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const openEdit = (food) => {
  editFormOriginal.value = JSON.parse(JSON.stringify(food))
  editForm.id = food.id || null
  editForm.name = food.name ?? ''
  editForm.category = food.category ?? ''
  
  let exp = null;
  if (food.expirationDate) {
    if (typeof food.expirationDate.toDate === 'function') {
      // Firestore Timestamp
      exp = food.expirationDate.toDate();
    } else {
      // already a Date or a string that Date can parse
      exp = new Date(food.expirationDate);
      if (isNaN(exp)) exp = null; // optional: guard against invalid parse
    }
  }
  editForm.expirationDate = exp ? toInputDateString(exp) : ''
  const created = food.createdAt && food.createdAt.toDate ? food.createdAt.toDate() : (food.createdAt ? new Date(food.createdAt) : null)
  editForm.createdAt = created ? toInputDateString(created) : ''
  editForm.price = food.price != null ? food.price : ''
  editForm.quantity = food.quantity != null ? food.quantity : ''
  editForm.unit = food.unit ?? ''
  showEditModal.value = true
}

const closeEdit = () => {
  showEditModal.value = false
  editForm.id = null
  editForm.name = ''
  editForm.category = ''
  editForm.expirationDate = ''
  editForm.createdAt = ''
  editForm.price = ''
  editForm.quantity = ''
  editForm.unit = ''
  editFormOriginal.value = null
}

const saveEdit = async () => {
  if (!editForm.id) return
  const refDoc = doc(db, 'food', editForm.id)
  const payload = {
    name: editForm.name,
    category: editForm.category,
    price: Number(editForm.price) || 0,
    quantity: Number(editForm.quantity) || 0,
    unit: editForm.unit || ''
  }
  if (editForm.expirationDate) {
    payload.expirationDate = Timestamp.fromDate(new Date(editForm.expirationDate))
  }
  if (editForm.createdAt) {
    payload.createdAt = Timestamp.fromDate(new Date(editForm.createdAt))
  }
  await updateDoc(refDoc, payload)
  // update local list
  const idx = foodItems.value.findIndex(f => f.id === editForm.id)
  if (idx !== -1) {
    foodItems.value[idx] = { ...foodItems.value[idx], ...payload }
  }
  closeEdit()
}


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
            <h3 class="h4">{{ expiringSoon }}</h3>
            <small class="text-muted">items</small>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="glass-card stat-card p-3">
            <div class="d-flex align-items-center gap-2 mb-2">
              <i class="bi bi-currency-dollar text-success"></i>
              <small class="text-muted">Potential Loss</small>
            </div>
            <h3 class="h4">${{ potentialLoss.toFixed(2) }}</h3>
            <small class="text-muted">if expired</small>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="glass-card stat-card p-3">
            <div class="d-flex align-items-center gap-2 mb-2">
              <i class="bi bi-calendar-x text-danger"></i>
              <small class="text-muted">Expired</small>
            </div>
            <h3 class="h4 text-danger">{{ expired }}</h3>
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
              <input v-model="searchText" type="text" class="form-control" placeholder="Search food items..." />
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
              <button v-on:click="toggleSortDirection" class="btn btn-outline-secondary sort-direction-btn w-100"
                :title="getSortButtonTitle">
                <i :class="getSortButtonIcon"></i>
              </button>
            </div>
          </div>
          <div v-if="filteredFoodItems.length === 0" class="text-center py-5">
            <i class="bi bi-search fs-1 text-muted"></i>
            <p class="text-muted mt-3">No food items found</p>
          </div>
          <div v-else class="food-scroll-container">
            <div class="food-scroll-section">
              <div v-for="food in filteredFoodItems" :key="food.id" class="food-card" :class="getFoodCardClass(food)">
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
                  <button class="food-btn food-btn-edit" @click.prevent="openEdit(food)"><i class="bi bi-pencil"></i>
                    Edit</button>
                  <button class="food-btn food-btn-use"><i class="bi bi-check2"></i> Use</button>
                  <button class="food-btn food-btn-delete"><i class="bi bi-trash"></i></button>
                </div>

              </div>
            </div>
              

            </div>
          </div>
        </div>
      </div>

</div>


  <!-- Edit Modal -->
  <div v-if="showEditModal" class="modal-backdrop">
    <div class="modal-card">
      <h3 class="h5 mb-3">Edit Food Item</h3>
      <div class="mb-2">
        <label class="form-label">Name</label>
        <input v-model="editForm.name" class="form-control" />
      </div>
      <div class="mb-2">
        <label class="form-label">Category</label>
        <input v-model="editForm.category" class="form-control" />
      </div>
      <div class="row g-2">
        <div class="col-6">
          <label class="form-label">Expiration Date</label>
          <input v-model="editForm.expirationDate" type="date" class="form-control" />
        </div>
        <div class="col-6">
          <label class="form-label">Created At</label>
          <input v-model="editForm.createdAt" type="date" class="form-control" />
        </div>
      </div>
      <div class="row g-2 mt-2">
        <div class="col-4">
          <label class="form-label">Price</label>
          <input v-model="editForm.price" type="number" step="0.01" class="form-control" />
        </div>
        <div class="col-4">
          <label class="form-label">Quantity</label>
          <input v-model="editForm.quantity" type="number" class="form-control" />
        </div>
        <div class="col-4">
          <label class="form-label">Unit</label>
          <input v-model="editForm.unit" class="form-control" />
        </div>
      </div>
      <div class="d-flex justify-content-end gap-2 mt-3">
        <button class="btn btn-secondary" @click="closeEdit">Cancel</button>
        <button class="btn btn-primary" @click="saveEdit">Save</button>
      </div>
    </div>
  </div>

  <!-- Edit Modal -->
  <div v-if="showEditModal" class="modal-backdrop">
    <div class="modal-card">
      <h3 class="h5 mb-3">Edit Food Item</h3>
      <div class="mb-2">
        <label class="form-label">Name</label>
        <input v-model="editForm.name" class="form-control" />
      </div>
      <div class="mb-2">
        <label class="form-label">Category</label>
        <input v-model="editForm.category" class="form-control" />
      </div>
      <div class="row g-2">
        <div class="col-6">
          <label class="form-label">Expiration Date</label>
          <input v-model="editForm.expirationDate" type="date" class="form-control" />
        </div>
        <div class="col-6">
          <label class="form-label">Created At</label>
          <input v-model="editForm.createdAt" type="date" class="form-control" />
        </div>
      </div>
      <div class="row g-2 mt-2">
        <div class="col-4">
          <label class="form-label">Price</label>
          <input v-model="editForm.price" type="number" step="0.01" class="form-control" />
        </div>
        <div class="col-4">
          <label class="form-label">Quantity</label>
          <input v-model="editForm.quantity" type="number" class="form-control" />
        </div>
        <div class="col-4">
          <label class="form-label">Unit</label>
          <input v-model="editForm.unit" class="form-control" />
        </div>
      </div>
      <div class="d-flex justify-content-end gap-2 mt-3">
        <button class="btn btn-secondary" @click="closeEdit">Cancel</button>
        <button class="btn btn-primary" @click="saveEdit">Save</button>
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

.food-scroll-container {
  max-width: 100%;
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

/* Modal styles */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-card {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  width: 600px;
  max-width: calc(100% - 32px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}
</style>
