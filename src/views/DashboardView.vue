<script setup>
import { db } from '../firebase.js';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { ref, computed, onMounted, reactive, watch } from 'vue';
import { getAuth } from 'firebase/auth';

const searchText = ref('');
const selectedCategory = ref('All Categories');
const sortBy = ref('expiration');
const sortDirection = ref('asc');

const showEditModal = ref(false);
const showAddModal = ref(false);
const showDeleteModal = ref(false);

const editForm = reactive({
  id: null,
  name: '',
  category: '',
  expirationDate: '',
  createdAt: '',
  price: '',
  quantity: '',
  unit: ''
});

const editFormOriginal = ref(null);

const addForm = reactive({
  name: '',
  category: '',
  expirationDate: '',
  createdAt: '',
  price: '',
  quantity: '',
  unit: ''
});

const deleteTarget = ref(null);
const showToast = ref(false);
const toastMessage = ref('');

function showToastFor(msg, ms = 2200) {
  toastMessage.value = msg;
  showToast.value = true;
  setTimeout(() => (showToast.value = false), ms);
}

const foodItems = ref([]);
const recipes = ref([]);
const activities = ref([]);

const auth = getAuth();
const user = ref(auth.currentUser);
const userId = computed(() => user.value?.uid || null);

auth.onAuthStateChanged(u => {
  user.value = u;
});

watch(userId, async (val) => {
  if (val) {
    // Load all user collections live after userId is available
    const foodItemsRef = collection(db, 'user', val, 'foodItems');
    const foodItemsSnapshot = await getDocs(foodItemsRef);
    foodItems.value = foodItemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const recipesRef = collection(db, 'user', val, 'recipes');
    const recipesSnapshot = await getDocs(recipesRef);
    recipes.value = recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const activityRef = collection(db, 'user', val, 'activities');
    const activitySnapshot = await getDocs(activityRef);
    activities.value = activitySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } else {
    // Clear data if user logs out
    foodItems.value = [];
    recipes.value = [];
    activities.value = [];
  }
});

// Fetch food items function
async function loadFoodItems() {
  if (userId.value) {
    const foodItemsRef = collection(db, 'user', userId.value, 'foodItems');
    const foodItemsSnapshot = await getDocs(foodItemsRef);
    foodItems.value = foodItemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  }
}

// Call loadFoodItems on load
onMounted(() => {
  loadFoodItems();
});

// Also, watch for userId changes (like login)
watch(userId, () => {
  loadFoodItems();
});

// Categories for select input
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
];

// Filtered food items (remove duplicates, search, filter, sort)
const filteredFoodItems = computed(() => {
  const uniqueItems = foodItems.value.filter(
    (item, index, self) =>
      index === self.findIndex(i => i.id === item.id)
  );

  let items = [...uniqueItems];

  // Exclude items with empty or whitespace-only names
  items = items.filter(item => item.name && item.name.trim().length > 0);

  // Search
  if (searchText.value && searchText.value.trim()) {
    const searchTerm = searchText.value.toLowerCase().trim();
    items = items.filter(item =>
      item.name.toLowerCase().includes(searchTerm)
    );
  }

  // Category filter
  if (selectedCategory.value && selectedCategory.value !== 'All Categories') {
    items = items.filter(item => item.category === selectedCategory.value);
  }

  // ... rest of your sorting logic
  // Apply sorting
  const direction = sortDirection.value === 'desc' ? -1 : 1
  
  switch (sortBy.value) {
    case 'expiration':
      items.sort((a, b) => {
        const dateA = new Date(a.expirationDate)
        const dateB = new Date(b.expirationDate)
        
        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0
        if (isNaN(dateA.getTime())) return 1
        if (isNaN(dateB.getTime())) return -1
        
        return (dateA.getTime() - dateB.getTime()) * direction
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
        
        // Secondary sort by name
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


  return items;
});

const toggleSortDirection = () => {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
};

const getSortButtonIcon = computed(() => {
  return sortDirection.value === 'asc' ? 'bi bi-sort-up' : 'bi bi-sort-down';
});

const getSortButtonTitle = computed(() => {
  const direction = sortDirection.value === 'asc' ? 'Ascending' : 'Descending';
  return `Sort ${direction}`;
});

const formatDate = (dateObj) => {
  let date;
  if (dateObj) {
    if (typeof dateObj.toDate === "function") {
      date = dateObj.toDate(); // Firestore Timestamp
    } else if (dateObj instanceof Date) {
      date = dateObj; // JS Date
    } else {
      date = new Date(dateObj); // try parsing string or other formats
    }
  } else {
    return ''; // or some default string for missing date
  }

  if (isNaN(date)) {
    return ''; // Handle invalid date
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const getRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

const getDaysLeft = (food) => {
  const now = new Date();
  let expDate;

  if (food.expirationDate) {
    if (typeof food.expirationDate.toDate === 'function') {
      // Firestore Timestamp
      expDate = food.expirationDate.toDate();
    } else if (food.expirationDate instanceof Date) {
      // Plain JS Date
      expDate = food.expirationDate;
    } else {
      // Try to parse a string
      expDate = new Date(food.expirationDate);
    }
  } else {
    // No expiration date, assume far future or zero days left
    return 0;
  }

  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expMidnight = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
  return Math.floor((expMidnight - nowMidnight) / (1000 * 60 * 60 * 24));
};

const getFoodCardClass = (food) => {
  const now = new Date();
  let expDate;

  if (food.expirationDate) {
    if (typeof food.expirationDate.toDate === 'function') {
      expDate = food.expirationDate.toDate();
    } else if (food.expirationDate instanceof Date) {
      expDate = food.expirationDate;
    } else {
      expDate = new Date(food.expirationDate);
    }
  } else {
    return 'normal-card'; // fallback class if no expirationDate
  }

  if (isNaN(expDate)) return 'normal-card'; // protect against invalid date

  const daysLeft = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));

  if (expDate < now) {
    return 'expired-card';
  } else if (daysLeft >= 1 && daysLeft <= 7) {
    return 'warning-card';
  } else {
    return 'normal-card';
  }
};


const getBadgeClass = (food) => {
  const daysLeft = getDaysLeft(food);
  if (daysLeft <= 1) {
    return 'badge-expired';
  } else if (daysLeft <= 7) {
    return 'badge-warning';
  } else {
    return 'badge-transparent';
  }
};

const expiringSoon = computed(() =>
  foodItems.value.filter(food => {
    const daysLeft = getDaysLeft(food);
    return daysLeft >= 0 && daysLeft <= 5;
  }).length
);

const expired = computed(() =>
  foodItems.value.filter(food => {
    const daysLeft = getDaysLeft(food);
    return daysLeft < 0;
  }).length
);

const potentialLoss = computed(() =>
  foodItems.value
    .filter(item => {
      const days = getDaysLeft(item);
      return days >= 0 && days <= 7;
    })
    .reduce((sum, item) => sum + (item.price || 0), 0)
);

const toInputDateString = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const openAdd = () => {
  addForm.name = '';
  addForm.category = '';
  addForm.expirationDate = '';
  addForm.createdAt = '';
  addForm.price = '';
  addForm.quantity = '';
  addForm.unit = '';
  showAddModal.value = true;
};

const closeAdd = () => {
  showAddModal.value = false;
  addForm.name = '';
  addForm.category = '';
  addForm.expirationDate = '';
  addForm.createdAt = '';
  addForm.price = '';
  addForm.quantity = '';
  addForm.unit = '';
};

const saveAdd = async () => {
  if (!userId.value) {
    console.warn('No userId available; cannot add food item');
    return;
  }
  const colRef = collection(db, 'user', userId.value, 'foodItems');
  const payload = {
    name: addForm.name || '',
    category: addForm.category || '',
    price: Number(addForm.price) || 0,
    quantity: Number(addForm.quantity) || 0,
    unit: addForm.unit || ''
  };
  if (addForm.expirationDate) {
    payload.expirationDate = Timestamp.fromDate(new Date(addForm.expirationDate));
  }
  if (addForm.createdAt) {
    payload.createdAt = Timestamp.fromDate(new Date(addForm.createdAt));
  } else {
    payload.createdAt = Timestamp.fromDate(new Date());
  }
  const newDocRef = await addDoc(colRef, payload);
  foodItems.value.unshift({ id: newDocRef.id, ...payload });
  closeAdd();
};

const openEdit = (food) => {
  editFormOriginal.value = JSON.parse(JSON.stringify(food));
  editForm.id = food.id || null;
  editForm.name = food.name ?? '';
  editForm.category = food.category ?? '';
  let exp = null;
  if (food.expirationDate) {
    if (typeof food.expirationDate.toDate === 'function') {
      exp = food.expirationDate.toDate();
    } else {
      exp = new Date(food.expirationDate);
      if (isNaN(exp)) exp = null;
    }
  }
  editForm.expirationDate = exp ? toInputDateString(exp) : '';
  const created = food.createdAt && food.createdAt.toDate ? food.createdAt.toDate() : (food.createdAt ? new Date(food.createdAt) : null);
  editForm.createdAt = created ? toInputDateString(created) : '';
  editForm.price = food.price != null ? food.price : '';
  editForm.quantity = food.quantity != null ? food.quantity : '';
  editForm.unit = food.unit ?? '';
  showEditModal.value = true;
};

const closeEdit = () => {
  showEditModal.value = false;
  editForm.id = null;
  editForm.name = '';
  editForm.category = '';
  editForm.expirationDate = '';
  editForm.createdAt = '';
  editForm.price = '';
  editForm.quantity = '';
  editForm.unit = '';
  editFormOriginal.value = null;
};

const saveEdit = async () => {
  if (!editForm.id) return;
  const refDoc = doc(db, 'user', userId.value, 'foodItems', editForm.id);
  const payload = {
    name: editForm.name,
    category: editForm.category,
    price: Number(editForm.price) || 0,
    quantity: Number(editForm.quantity) || 0,
    unit: editForm.unit || ''
  };
  if (editForm.expirationDate) {
    payload.expirationDate = Timestamp.fromDate(new Date(editForm.expirationDate));
  }
  if (editForm.createdAt) {
    payload.createdAt = Timestamp.fromDate(new Date(editForm.createdAt));
  }
  await updateDoc(refDoc, payload);
  const idx = foodItems.value.findIndex(f => f.id === editForm.id);
  if (idx !== -1) {
    foodItems.value[idx] = { ...foodItems.value[idx], ...payload };
  }
  closeEdit();
};

// Delete food item (performs deletion; UI confirmation handled separately)
const deleteFood = async (food) => {
  if (!food || food.id == null) return;
  try {
    const uid = userId.value;
    if (!uid) {
      console.warn('Not logged in');
      return false;
    }
    const refDoc = doc(db, 'user', uid, 'foodItems', food.id);
    await deleteDoc(refDoc);
    // remove locally
    const idx = foodItems.value.findIndex(f => f.id === food.id);
    if (idx !== -1) foodItems.value.splice(idx, 1);
    return true;
  } catch (err) {
    console.error('Failed to delete', err);
    return false;
  }
};

const openDelete = (food) => {
  deleteTarget.value = food || null;
  showDeleteModal.value = true;
};

const closeDelete = () => {
  showDeleteModal.value = false;
  deleteTarget.value = null;
};

const confirmDelete = async () => {
  if (!deleteTarget.value) return;
  const ok = await deleteFood(deleteTarget.value);
  closeDelete();
  if (ok) showToastFor('Item deleted');
  else showToastFor('Failed to delete');
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
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
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
              <button @click="toggleSortDirection" class="btn btn-outline-secondary sort-direction-btn w-100"
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
              <div v-for="food in filteredFoodItems" :key="food.id" :class="['food-card', getFoodCardClass(food)]">
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
                  <button class="food-btn food-btn-delete" @click.prevent="openDelete(food)"><i class="bi bi-trash"></i></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-4 d-none d-lg-block">
        <div class="glass-card p-4">
          <h3 class="h5 mb-3">Recent Activity</h3>
          <div v-if="activities.length === 0" class="text-center py-4">
            <p class="text-muted">No recent activity</p>
          </div>
          <div v-else class="d-flex flex-column gap-3">
            <div v-for="activity in activities" :key="activity.id" class="pb-3 border-bottom">
              <p class="mb-1 small">{{ activity.description }}</p>
              <small class="text-muted">{{ getRelativeTime(activity.createdAt) }}</small>
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

    <!-- Floating Add Button -->
    <button class="fab-add" @click="openAdd" title="Add Food">
      <i class="bi bi-plus-lg"></i>
    </button>

    <!-- Add Modal -->
    <div v-if="showAddModal" class="modal-backdrop">
      <div class="modal-card">
        <h3 class="h5 mb-3">Add Food Item</h3>
        <div class="mb-2">
          <label class="form-label">Name</label>
          <input v-model="addForm.name" class="form-control" />
        </div>
        <div class="mb-2">
          <label class="form-label">Category</label>
          <input v-model="addForm.category" class="form-control" />
        </div>
        <div class="row g-2">
          <div class="col-6">
            <label class="form-label">Expiration Date</label>
            <input v-model="addForm.expirationDate" type="date" class="form-control" />
          </div>
          <div class="col-6">
            <label class="form-label">Created At</label>
            <input v-model="addForm.createdAt" type="date" class="form-control" />
          </div>
        </div>
        <div class="row g-2 mt-2">
          <div class="col-4">
            <label class="form-label">Price</label>
            <input v-model="addForm.price" type="number" step="0.01" class="form-control" />
          </div>
          <div class="col-4">
            <label class="form-label">Quantity</label>
            <input v-model="addForm.quantity" type="number" class="form-control" />
          </div>
          <div class="col-4">
            <label class="form-label">Unit</label>
            <input v-model="addForm.unit" class="form-control" />
          </div>
        </div>
        <div class="d-flex justify-content-end gap-2 mt-3">
          <button class="btn btn-secondary" @click="closeAdd">Cancel</button>
          <button class="btn btn-primary" @click="saveAdd">Add</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Delete Confirmation Modal -->
  <div v-if="showDeleteModal" class="modal-backdrop">
    <div class="modal-card delete-modal">
      <h5>Delete Item</h5>
      <p>Are you sure you want to delete <strong>{{ deleteTarget?.name }}</strong>? This action cannot be undone.</p>
      <div class="d-flex justify-content-end gap-2">
        <button class="btn btn-secondary" @click="closeDelete">Cancel</button>
        <button class="btn btn-danger" @click="confirmDelete">Delete</button>
      </div>
    </div>
  </div>

  <!-- Toast -->
  <div v-if="showToast" class="custom-toast">{{ toastMessage }}</div>
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

/* Floating Add button */
.fab-add {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(180deg, #10b981, #059669);
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 6px 18px rgba(5, 150, 105, 0.25);
  cursor: pointer;
  z-index: 2500;
}

.fab-add:hover {
  transform: translateY(-2px);
}

.custom-toast {
  position: fixed;
  right: 24px;
  bottom: 100px;
  background: rgba(17,24,39,0.95);
  color: white;
  padding: 10px 14px;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.18);
  z-index: 6000;
  font-weight: 600;
}

.modal-card h5 { margin-bottom: 8px }
.modal-card p { margin-bottom: 12px }

/* Delete modal — white interior with pulsing red glow */
.delete-modal {
  background: #ffffff; /* keep interior white for better readability */
  color: #111;
  border: 1px solid rgba(229,57,53,0.08);
  position: relative;
}
.delete-modal .btn-secondary {
  background: #f3f4f6;
  color: #111;
}
.delete-modal .btn-danger {
  background: #e53935;
  border-color: #b71c1c;
}

/* pulsing red glow around the modal */
.modal-backdrop .delete-modal {
  box-shadow: 0 8px 30px rgba(229,57,53,0.08), 0 0 0 rgba(229,57,53,0);
  animation: pulseRed 1.6s ease-in-out infinite;
}

@keyframes pulseRed {
  0% { box-shadow: 0 8px 30px rgba(229,57,53,0.06), 0 0 0 rgba(229,57,53,0); }
  50% { box-shadow: 0 18px 60px rgba(229,57,53,0.28), 0 0 36px rgba(229,57,53,0.12); }
  100% { box-shadow: 0 8px 30px rgba(229,57,53,0.06), 0 0 0 rgba(229,57,53,0); }
}
</style>
