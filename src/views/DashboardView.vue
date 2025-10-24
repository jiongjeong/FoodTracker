<script setup>
import { useRouter } from 'vue-router';
import { db } from '../firebase.js';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { ref, computed, onMounted, reactive, watch, watchEffect } from 'vue';
import { getAuth } from 'firebase/auth';
import { Bar, Pie, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from 'chart.js';

// Register Chart.js components so charts render
ChartJS.register(Title, Tooltip, Legend, BarElement, ArcElement, CategoryScale, LinearScale, PointElement, LineElement);

const router = useRouter();
function goToRecipes(food) {
  // Navigate to /recipes with a query param for search
  router.push({ path: '/recipes', query: { search: food.name } });
}
const searchText = ref('');
const selectedCategory = ref('All Categories');
const sortBy = ref('expiration');
const sortDirection = ref('asc');

const showEditModal = ref(false);
const showAddModal = ref(false);
const showDeleteModal = ref(false);
const showUseModal = ref(false);


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
const useForm = reactive({
  id: null,
  name: '',
  quantity: 0,
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
const activitiesLoaded = ref(false);

// Activity filter and sort controls
const activityTypeFilter = ref(''); // default to placeholder
const activitySortDirection = ref('desc'); // 'desc' = newest first, 'asc' = oldest first

const activityTypeOptions = [
  { label: 'All', value: 'All' },
  { label: 'Added', value: 'addFood' },
  { label: 'Used', value: 'conFood' },
  { label: 'Expired', value: 'expFood' },
];

// Time frame filter
const activityTimeFrame = ref(''); // default to placeholder
const activityTimeFrameOptions = [
  { label: 'All', value: 'all' },
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
];

const filteredSortedActivities = computed(() => {
  let acts = [...activities.value];
  // Filter by type
  if (activityTypeFilter.value && activityTypeFilter.value !== 'All') {
    acts = acts.filter(a => a.activityType === activityTypeFilter.value);
  }
  // Filter by time frame
  if (activityTimeFrame.value && activityTimeFrame.value !== 'all') {
    const now = new Date();
    let cutoff;
    if (activityTimeFrame.value === '24h') {
      cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (activityTimeFrame.value === '7d') {
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (activityTimeFrame.value === '30d') {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    acts = acts.filter(a => {
      const d = new Date(a.createdAt);
      return d >= cutoff;
    });
  }
  // Sort by createdAt
  acts.sort((a, b) => {
    const dateA = parseCreatedAt(a.createdAt);
    const dateB = parseCreatedAt(b.createdAt);
    if (!dateA && !dateB) return 0;
    if (!dateA) return activitySortDirection.value === 'desc' ? 1 : -1;
    if (!dateB) return activitySortDirection.value === 'desc' ? -1 : 1;
    return activitySortDirection.value === 'desc'
      ? dateB - dateA
      : dateA - dateB;
  });
  return acts;
});

// Helper to parse createdAt values (ISO string, JS Date, or Firestore Timestamp)
function parseCreatedAt(value) {
  if (!value) return null;
  try {
    if (typeof value.toDate === 'function') return value.toDate();
    if (value instanceof Date) return value;
    const d = new Date(value);
    return isNaN(d) ? null : d;
  } catch (e) {
    return null;
  }
}

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

// Fetch activities function
async function loadActivities() {
  if (userId.value) {
    const activityRef = collection(db, 'user', userId.value, 'activities');
    const activitySnapshot = await getDocs(activityRef);
    activities.value = activitySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    activitiesLoaded.value = true;
  }
}

// Call loadFoodItems and loadActivities on load
onMounted(() => {
  loadFoodItems();
  loadActivities();
});

// Also, watch for userId changes (like login)
watch(userId, () => {
  loadFoodItems();
  loadActivities();
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

const categoryUnits = {
  'All Categories': [
    'piece(s)', 'kg(s)', 'gram(s)', 'liter(s)', 'milliliter(s)',
    'pack(s)', 'bag(s)', 'box(es)', 'bottle(s)'
  ],
  'Fruits & Vegetables': [
    'piece(s)', 'kg(s)', 'gram(s)', 'bag(s)', 'bunch(es)'
  ],
  'Dairy & Eggs': [
    'liter(s)', 'milliliter(s)', 'dozen(s)', 'piece(s)', 'carton(s)'
  ],
  'Meat & Poultry': [
    'kg(s)', 'gram(s)', 'pound(s)', 'ounce(s)', 'pack(s)', 'piece(s)'
  ],
  'Bakery': [
    'piece(s)', 'slice(s)', 'loaf(s)', 'dozen(s)', 'gram(s)'
  ],
  'Snacks': [
    'piece(s)', 'gram(s)', 'pack(s)', 'bag(s)', 'box(es)'
  ],
  'Beverages': [
    'liter(s)', 'milliliter(s)', 'bottle(s)', 'can(s)', 'pack(s)'
  ],
  'Condiments & Sauces': [
    'milliliter(s)', 'liter(s)', 'jar(s)', 'bottle(s)'
  ],
  'Frozen Foods': [
    'kg(s)', 'gram(s)', 'pack(s)', 'bag(s)'
  ],
  'Grains & Pasta': [
    'kg(s)', 'gram(s)', 'bag(s)', 'box(es)'
  ],
  'Other': [
    'piece(s)', 'unit(s)', 'pack(s)', 'box(es)'
  ]
};

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
          function parseDate(val) {
            if (!val) return null;
            if (typeof val.toDate === 'function') return val.toDate();
            if (val instanceof Date) return val;
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
          }
          const dateA = parseDate(a.expirationDate);
          const dateB = parseDate(b.expirationDate);

          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;

          return (dateA.getTime() - dateB.getTime()) * direction;
        });
        break;

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
  const date = parseCreatedAt(dateString) || new Date(dateString);
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

watchEffect(() => {
  if (!activitiesLoaded.value) return;
  const expiredFoods = foodItems.value.filter(food => getDaysLeft(food) < 0)
  const uid = userId.value;
  expiredFoods.forEach(async food => {
    // Prevent duplicate logs by checking both local and Firestore activities
    const alreadyLogged = activities.value.some(a => a.foodName === food.name && a.activityType === 'expFood');
    if (!alreadyLogged && uid) {
      // Check Firestore for existing expFood activity for this food
      const actRef = collection(db, 'user', uid, 'activities');
      const q = query(actRef, where('foodName', '==', food.name), where('activityType', '==', 'expFood'));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        // Add to Firestore
        const payload = {
          activityType: 'expFood',
          createdAt: new Date().toISOString(),
          foodName: food.name || '',
          category: food.category || 'Other',
          price: String(food.price || ''),
          quantity: String(food.quantity || ''),
          unit: String(food.unit || ''),
          note: 'expired'
        };
        await addDoc(actRef, payload);
        activities.value.unshift({
          id: Math.random().toString(36).substring(2, 9),
          ...payload
        });
      }
    }
  })
})

const analytics = computed(() => {
  // const items = activeFoodItems.value
  const wasteActivities = activities.value.filter(a => a.activityType === 'expFood')
  // fix: check activityType for consumed food activities
  const usedActivities = activities.value.filter(a => a.activityType === 'conFood')
  const donatedActivities = activities.value.filter(a => a.activityType === "donFood")
  console.log(wasteActivities)
  console.log(usedActivities)
  console.log("mine" + donatedActivities)
  console.log("end")
  // Total waste calculation
  const totalWasteItems = wasteActivities.length
  const totalWasteMoney = wasteActivities.reduce((total, activity) => {
    // Multiply price by quantity (convert price to number since it's a string)
    return total + (Number(activity.price));
  }, 0);

  // Total saved calculation: count only fully consumed food
  const totalSavedItems = activities.value.filter(a => a.activityType === 'conFood' && a.note === 'fully consumed').length
  const totalSavedMoney = usedActivities.reduce((total, activity) => {
  // Multiply price by quantity (convert price to number since it's a string)
  return total + (Number(activity.price) );
}, 0);
  
  // Reduction percentage - items used before expiry vs total items
  const totalItemsHandled = totalWasteItems + totalSavedItems
  const reductionPercentage = totalItemsHandled > 0 ? Math.round((totalSavedItems / totalItemsHandled) * 100) : 0

  // Current inventory
  const inventoryValue = foodItems.value.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    return sum + price;
  }, 0);
  const inventoryItems = foodItems.value.length;

  // TODO Food Donated
  // const foodDonated = donatedActivities.length

  // foodScore algo = itemssaved - itemswasted + moneysaved
  const itemsScore = Math.max(0, totalSavedItems * 0.4 - totalWasteItems * 0.4);
  const moneyScore = Math.max(0,(totalSavedMoney*0.2) - (totalWasteMoney*0.2) )
  const foodScore= Math.round(itemsScore + moneyScore)

  return {
    totalWaste: { money: totalWasteMoney, items: totalWasteItems },
    totalSaved: { money: totalSavedMoney, items: totalSavedItems },
    reduction: reductionPercentage,
  inventory: { value: inventoryValue, items: inventoryItems },
  foodScore: foodScore
  }
})

// Chart options
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true },
    title: { display: false }
  }
};

// Waste vs Savings bar chart data
const wasteVsSavingsChart = computed(() => {
  const waste = analytics.value.totalWaste.items || 0;
  const saved = analytics.value.totalSaved.items || 0;
  return {
    labels: ['Waste', 'Saved'],
    datasets: [
      {
        label: 'Items',
        backgroundColor: ['#dc2626', '#16a34a'],
        data: [waste, saved]
      }
    ]
  };
});

// Waste by category pie chart (simple breakdown based on activities)
const wasteByCategoryChart = computed(() => {
  const wasteActs = activities.value.filter(a => a.activityType === 'expFood');
  const counts = {};
  wasteActs.forEach(a => {
    const cat = a.category || 'Unknown';
    counts[cat] = (counts[cat] || 0) + (Number(a.quantity) || 1);
  });
  const labels = Object.keys(counts);
  const data = labels.map(l => counts[l]);
  return {
    labels,
    datasets: [{ data, backgroundColor: ['#eab308', '#f43f5e', '#10b981', '#3b82f6', '#a78bfa'] }]
  };
});

// Monthly spending line chart (dummy aggregation by month from activities)
const monthlySpendingChart = computed(() => {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const moneyByMonth = months.map(() => 0);
  activities.value.forEach(a => {
    const d = new Date(a.createdAt);
    if (!isNaN(d)) {
      const m = d.getMonth();
      moneyByMonth[m] += Number(a.price) || 0;
    }
  });
  return {
    labels: months.map(m => new Date(0, m - 1).toLocaleString('en-US', { month: 'short' })),
    datasets: [{ label: 'Spending', data: moneyByMonth, borderColor: '#0ea5a4', tension: 0.3, fill: false }]
  };
});

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

const openUse = (food) => {
  useForm.id = food.id;
  useForm.name = food.name;
  useForm.quantity = 1; // default quantity to use
  useForm.unit = food.unit || '';
  showUseModal.value = true;
};
const closeUse = () => {
  showUseModal.value = false;
  useForm.id = null;
  useForm.name = '';
  useForm.quantity = 0;
  useForm.unit = '';
};
const saveUse = async () => {
  if (!useForm.id || useForm.quantity <= 0) return;

  const uid = userId.value;
  if (!uid) return;

  try {
    // Find the food item locally
    const foodIndex = foodItems.value.findIndex(f => f.id === useForm.id);
    if (foodIndex === -1) return;

    const food = foodItems.value[foodIndex];

    // Ensure we don't use more than available
    const usedQty = Math.min(useForm.quantity, food.quantity);
    const newQty = food.quantity - usedQty;

    const refDoc = doc(db, 'user', uid, 'foodItems', useForm.id);
    const actRef = collection(db, 'user', uid, 'activities');

    // Log normal use activity
    const activityPayload = {
      activityType: 'conFood',
      createdAt: new Date().toISOString(),
      foodName: food.name,
      category: food.category || '',
      price: String(food.price || 0),
      quantity: String(usedQty),
      unit: food.unit || ''
    };
    await addDoc(actRef, activityPayload);
    activities.value.unshift({
      id: Math.random().toString(36).substring(2, 9),
      ...activityPayload
    });

    if (newQty <= 0) {
      // Remove from Firestore and local list
      await deleteDoc(refDoc);
      foodItems.value.splice(foodIndex, 1);

      // Log fully consumed activity
      const fullConsumedPayload = {
        activityType: 'conFood',
        createdAt: new Date().toISOString(),
        foodName: food.name,
        category: food.category || '',
        price: String(food.price || 0),
        quantity: '0',
        unit: food.unit || '',
        note: 'fully consumed'
      };
      await addDoc(actRef, fullConsumedPayload);
      activities.value.unshift({
        id: Math.random().toString(36).substring(2, 9),
        ...fullConsumedPayload
      });

      showToastFor(`${food.name} fully consumed and removed`);
    } else {
      // Update Firestore food quantity
      await updateDoc(refDoc, {
        quantity: newQty
      });
      // Update local foodItems
      foodItems.value[foodIndex].quantity = newQty;
      showToastFor(`Used ${usedQty} ${food.unit} of ${food.name}`);
    }
    closeUse();
  } catch (err) {
    console.error('Failed to log used food:', err);
    showToastFor('Failed to update food usage.');
  }
};

// Add computed property to get units based on selected category
const availableUnits = computed(() => {
  const category = editForm.category || addForm.category || 'All Categories';
  return categoryUnits[category] || categoryUnits['All Categories'];
});

const openAdd = () => {
  addForm.name = '';
  addForm.category = '';
  addForm.expirationDate = '';
  // auto-fill createdAt to today's date (YYYY-MM-DD) and keep it uneditable
  addForm.createdAt = toInputDateString(new Date());
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
    console.warn('No userId available; cannot add food item')
    return;
  }

  const colRef = collection(db, 'user', userId.value, 'foodItems');
  const actRef = collection(db, 'user', userId.value, 'activities');

  const foodPayload = {
    name: addForm.name || '',
    category: addForm.category || '',
    price: Number(addForm.price) || 0,
    quantity: Number(addForm.quantity) || 0,
    unit: addForm.unit || '',
    createdAt: addForm.createdAt
      ? Timestamp.fromDate(new Date(addForm.createdAt))
      : Timestamp.fromDate(new Date()),
  };

  if (addForm.expirationDate) {
    foodPayload.expirationDate = Timestamp.fromDate(new Date(addForm.expirationDate));
  }

  try {
    // Add food item to Firestore
    const newDocRef = await addDoc(colRef, foodPayload);

    // Log the activity in 'activities'
    const activityPayload = {
      activityType: 'addFood',
      createdAt: new Date().toISOString(), // or use Timestamp.now() if a Firestore Timestamp is wanted
      foodName: addForm.name || '',
      category: addForm.category || '',
      price: String(addForm.price || ''),
      quantity: String(addForm.quantity || ''),
      unit: String(addForm.unit || '')
    };

    await addDoc(actRef, activityPayload);

    // Add new item locally for instant UI feedback
    foodItems.value.unshift({ id: newDocRef.id, ...foodPayload });

    // Refresh activities list to show new log
    activities.value.unshift({
      id: Math.random().toString(36).substring(2, 9),
      ...activityPayload,
    });

    showToastFor('Food item added and activity logged!');
    closeAdd();
  } catch (error) {
    console.error('Error adding food item or activity:', error);
    showToastFor('Failed to add food item.');
  }
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

import { query, where } from 'firebase/firestore';

const deleteFood = async (food) => {
  if (!food || food.id == null) return;
  try {
    const uid = userId.value;
    if (!uid) {
      console.warn('Not logged in');
      return false;
    }
    // Delete the food item doc
    const refDoc = doc(db, 'user', uid, 'foodItems', food.id);
    await deleteDoc(refDoc);

    // Delete corresponding activities
    const actRef = collection(db, 'user', uid, 'activities');
    // Find all activities for this food item by foodName and activityType (optional: tighten filter)
    const q = query(
      actRef,
      where('foodName', '==', food.name),
      where('activityType', '==', 'addFood')
    );
    const actSnapshot = await getDocs(q);

    // Delete all matching activity docs
    const deletePromises = [];
    actSnapshot.forEach(docSnap => {
      deletePromises.push(deleteDoc(docSnap.ref));
    });
    await Promise.all(deletePromises);

    // Remove locally
    const idx = foodItems.value.findIndex(f => f.id === food.id);
    if (idx !== -1) foodItems.value.splice(idx, 1);

    // (Optionally) update your activities UI list as well
    activities.value = activities.value.filter(
      a => !(a.foodName === food.name && a.activityType === 'addFood')
    );

    return true;
  } catch (err) {
    console.error('Failed to delete food and its activity log:', err);
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

      <div class="row g-3 mb-3">
        <div class="col-6 col-lg-3">
          <div class="glass-card stat-card p-3">
            <div class="d-flex align-items-center gap-2 mb-2">
              <i class="bi bi-graph-up-arrow text-success"></i>
              <small class="text-muted">Food Score</small>
            </div>
            <h3 class="h4">{{ analytics.foodScore }}</h3>
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

      <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3">
          <div class="glass-card stat-card p-3">
            <div class="d-flex align-items-center gap-2 mb-2">
              <i class="bi bi-trash text-danger"></i>
              <small class="text-muted">Total Waste</small>
            </div>
            <h3 class="h4 text-danger mb-1">${{ analytics.totalWaste.money }}</h3>
            <small class="text-muted">{{ analytics.totalWaste.items }} items</small>
          </div>
        </div>
        
        <div class="col-6 col-lg-3">
          <div class="glass-card stat-card p-3">
            <div class="d-flex align-items-center gap-2 mb-2">
              <i class="bi bi-piggy-bank text-success"></i>
              <small class="text-muted">Total Saved</small>
            </div>
            <h3 class="h4 text-success mb-1">${{ analytics.totalSaved.money }}</h3>
            <small class="text-muted">{{ analytics.totalSaved.items }} items</small>
          </div>
        </div>
        
        <div class="col-6 col-lg-3">
          <div class="glass-card stat-card p-3">
            <div class="d-flex align-items-center gap-2 mb-2">
              <i class="bi bi-arrow-up text-primary"></i>
              <small class="text-muted">Reduction</small>
            </div>
            <h3 class="h4 text-primary mb-1">{{ analytics.reduction }}%</h3>
            <small class="text-muted">food used before expiry</small>
          </div>
        </div>
        
        <div class="col-6 col-lg-3">
          <div class="glass-card stat-card p-3">
            <div class="d-flex align-items-center gap-2 mb-2">
              <i class="bi bi-box text-info"></i>
              <small class="text-muted">Inventory</small>
            </div>
            <h3 class="h4 text-info mb-1">${{ analytics.inventory.value.toFixed(2) }}</h3>
            <small class="text-muted">{{ analytics.inventory.items }} items</small>
          </div>
        </div>
      </div>
      <!-- Charts Section -->
    <div class="row g-4 mb-3">
      <!-- Waste vs Savings Bar Chart -->
      <div class="col-lg-4">
        <div class="glass-card p-4">
          <h5 class="mb-4">
            <i class="bi bi-bar-chart me-2"></i>
            Waste vs Savings
          </h5>
          <div style="height: 300px;">
            <Bar v-if="wasteVsSavingsChart && wasteVsSavingsChart.labels && wasteVsSavingsChart.labels.length" :data="wasteVsSavingsChart" :options="chartOptions" />
          </div>
        </div>
      </div>

      <!-- Waste by Category Pie Chart -->
      <div class="col-lg-4">
        <div class="glass-card p-4">
          <h5 class="mb-4">
            <i class="bi bi-pie-chart me-2"></i>
            Waste by Category
          </h5>
          <div style="height: 300px;">
            <Pie v-if="wasteByCategoryChart && wasteByCategoryChart.labels && wasteByCategoryChart.labels.length" :data="wasteByCategoryChart" :options="chartOptions" />
          </div>
        </div>
      </div>

      <!-- Monthly Spending Trend -->
      <div class="col-lg-4">
        <div class="glass-card p-4">
          <h5 class="mb-4">
            <i class="bi bi-graph-up me-2"></i>
            Monthly Spending Trend
          </h5>
          <div style="height: 300px;">
            <Line v-if="monthlySpendingChart && monthlySpendingChart.labels && monthlySpendingChart.labels.length" :data="monthlySpendingChart" :options="chartOptions" />
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
              <div v-for="food in filteredFoodItems" :key="food.id" :class="['food-card', getFoodCardClass(food), 'd-flex', 'flex-column', 'justify-content-between']">
                <div>
                  <div class="food-header">
                    <div>
                      <div class="food-title-group align-items-center d-flex gap-2">
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
                </div>
                <div class="d-flex align-items-end justify-content-between mt-auto w-100">
                  <button class="food-btn food-btn-recipe px-2 py-1" style="font-size: 0.92em; min-width: 0;" @click.prevent="goToRecipes(food)"><i class="bi bi-book"></i> Recipes</button>
                  <div class="food-actions d-flex gap-2">
                    <button class="food-btn food-btn-edit" @click.prevent="openEdit(food)"><i class="bi bi-pencil"></i>
                      Edit</button>
                    <button class="food-btn food-btn-use" @click.prevent="openUse(food)"><i class="bi bi-check2"></i> Use</button>
                    <button class="food-btn food-btn-delete" @click.prevent="openDelete(food)"><i
                        class="bi bi-trash"></i></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-4 d-none d-lg-block d-flex flex-column h-100">
        <div class="glass-card p-4 d-flex flex-column flex-grow-1 h-100" style="min-height: 0;">
          <h3 class="h5 mb-2">Recent Activity</h3>
          <div class="d-flex align-items-center justify-content-between mb-3">
            <div class="d-flex gap-2 w-100">
              <select v-model="activityTypeFilter" class="form-select form-select-sm"
                style="width: auto; min-width: 110px;">
                <option disabled value="">Activity</option>
                <option v-for="opt in activityTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
              <select v-model="activityTimeFrame" class="form-select form-select-sm"
                style="width: auto; min-width: 90px;">
                <option disabled value="">Time</option>
                <option v-for="opt in activityTimeFrameOptions" :key="opt.value" :value="opt.value">{{ opt.label }}
                </option>
              </select>
              <button class="btn btn-outline-secondary btn-sm"
                :title="activitySortDirection === 'desc' ? 'Newest first' : 'Oldest first'"
                @click="activitySortDirection = activitySortDirection === 'desc' ? 'asc' : 'desc'">
                <i :class="activitySortDirection === 'desc' ? 'bi bi-sort-down' : 'bi bi-sort-up'"></i>
              </button>
            </div>
          </div>
          <div class="flex-grow-1 d-flex flex-column min-h-0">
            <div v-if="filteredSortedActivities.length === 0" class="text-center py-4 flex-grow-1">
              <p class="text-muted">No recent activity</p>
            </div>
            <div v-else class="d-flex flex-column gap-3 activity-scroll flex-grow-1">
              <div v-for="activity in filteredSortedActivities" :key="activity.id" class="pb-3 border-bottom">
                <div v-if="activity.activityType === 'addFood'">
                  <p class="mb-1 small">
                    <strong>{{ activity.quantity }} {{ activity.unit }} of {{ activity.foodName }} added</strong>
                  </p>
                </div>
                <div v-else-if="activity.activityType === 'conFood'">
                  <p class="mb-1 small">
                    <strong v-if="activity.note === 'fully consumed'" class="text-success">
                      All of {{ activity.foodName }} fully consumed
                    </strong>
                    <strong v-else>
                      {{ activity.quantity }} {{ activity.unit }} of {{ activity.foodName }} used
                    </strong>
                  </p>
                </div>
                <div v-else-if="activity.activityType === 'expFood'">
                  <p class="mb-1 small">
                    <strong v-if="activity.note === 'expired'" class="text-danger">
                      {{ activity.quantity }} {{ activity.unit }} of {{ activity.foodName }} expired
                    </strong>
                    <strong v-else>
                      {{ activity.quantity }} {{ activity.unit }} of {{ activity.foodName }} expired
                    </strong>
                  </p>
                </div>
                <div v-else>
                  <p class="mb-1 small">
                    <strong>{{ activity.foodName }} — {{ activity.activityType }}</strong>
                  </p>
                </div>
                <small class="text-muted">
                  {{ getRelativeTime(activity.createdAt) }}
                </small>
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
          <select v-model="editForm.category" class="form-select">
            <option disabled value="">{{ editForm.category || 'Select a category' }}</option>
            <option v-for="cat in categories.filter(c => c !== 'All Categories')" :key="cat" :value="cat">
              {{ cat }}
            </option>
          </select>
        </div>
        <div class="row g-2">
          <div class="col-6">
            <label class="form-label">Expiration Date</label>
            <input v-model="editForm.expirationDate" type="date" class="form-control" />
          </div>
          <div class="col-6">
            <label class="form-label">Created At</label>
            <input v-model="editForm.createdAt" type="date" class="form-control" disabled />
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
            <select v-model="editForm.unit" class="form-select">
              <option disabled value="">{{ editForm.unit || 'Select a unit' }}</option>
              <option v-for="unit in availableUnits" :key="unit" :value="unit">{{ unit }}</option>
            </select>
          </div>
        </div>
        <div class="d-flex justify-content-end gap-2 mt-3">
          <button class="btn btn-secondary" @click="closeEdit">Cancel</button>
          <button class="btn btn-primary" @click="saveEdit">Save</button>
        </div>
      </div>
    </div>

    <!-- Use Food Modal -->
    <div v-if="showUseModal" class="modal-backdrop">
      <div class="modal-card">
        <h3 class="h5 mb-3">Use Food Item</h3>
        <p>How much of <strong>{{ useForm.name }}</strong> did you use?</p>
        <div class="row g-2 mt-2">
          <div class="col-6">
            <label class="form-label">Quantity</label>
            <input v-model.number="useForm.quantity" type="number" min="1" class="form-control" />
          </div>
          <div class="col-6">
            <label class="form-label">Unit</label>
            <input v-model="useForm.unit" type="text" class="form-control" />
          </div>
        </div>
        <div class="d-flex justify-content-end gap-2 mt-3">
          <button class="btn btn-secondary" @click="closeUse">Cancel</button>
          <button class="btn btn-primary" @click="saveUse">Use</button>
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
          <select v-model="addForm.category" class="form-select">
            <option disabled value="">Select a category</option>
            <option v-for="cat in categories.filter(c => c !== 'All Categories')" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
        <div class="row g-2">
          <div class="col-6">
            <label class="form-label">Expiration Date</label>
            <input v-model="addForm.expirationDate" type="date" class="form-control" />
          </div>
          <div class="col-6">
            <label class="form-label">Created At</label>
            <input v-model="addForm.createdAt" type="date" class="form-control" disabled />
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
            <select v-model="addForm.unit" class="form-select">
              <option disabled value="">Select a unit</option>
              <option v-for="unit in availableUnits" :key="unit" :value="unit">{{ unit }}</option>
            </select>
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
  font-size: 1.25rem;
  /* reduced slightly */
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
  font-size: 1.1rem;
  /* reduced slightly */
  font-weight: bold;
  margin-left: 12px;
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
  background: rgba(17, 24, 39, 0.95);
  color: white;
  padding: 10px 14px;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  z-index: 6000;
  font-weight: 600;
}

.modal-card h5 {
  margin-bottom: 8px
}

.modal-card p {
  margin-bottom: 12px
}

/* Delete modal — white interior with pulsing red glow */
.delete-modal {
  background: #ffffff;
  /* keep interior white for better readability */
  color: #111;
  border: 1px solid rgba(229, 57, 53, 0.08);
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
  box-shadow: 0 8px 30px rgba(229, 57, 53, 0.08), 0 0 0 rgba(229, 57, 53, 0);
  animation: pulseRed 1.6s ease-in-out infinite;
}

@keyframes pulseRed {
  0% {
    box-shadow: 0 8px 30px rgba(229, 57, 53, 0.06), 0 0 0 rgba(229, 57, 53, 0);
  }

  50% {
    box-shadow: 0 18px 60px rgba(229, 57, 53, 0.28), 0 0 36px rgba(229, 57, 53, 0.12);
  }

  100% {
    box-shadow: 0 8px 30px rgba(229, 57, 53, 0.06), 0 0 0 rgba(229, 57, 53, 0);
  }
}

/* Make activity card scrollable and match inventory height */
.activity-scroll {
  min-height: 0;
  max-height: 400px;
  overflow-y: auto;
  flex: 1 1 auto;
}

.min-h-0 {
  min-height: 0;
}
</style>
