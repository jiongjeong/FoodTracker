<script setup>
import { useRouter } from 'vue-router';
import { db } from '../firebase.js';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, Timestamp, query, where, getDoc } from 'firebase/firestore';
import { ref, computed, reactive, watch, watchEffect } from 'vue';
import { getAuth } from 'firebase/auth';
import { useAlert } from '@/composables/useAlert.js';

const { success, error, confirm } = useAlert();
import {
  chartOptions,
  wasteVsSavingsOpts,
  wasteRingOpts,
  centerTextPlugin,
  buildWasteVsSavingsData,
  buildWasteByCategoryChart,
  styleAsRing,
  WASTE_COLORS,
  leaderboardNudge,
  getPercentageLabelPosition, createAllLegendItems, darkenColor
} from '@/composables/dashboardDesign'
import FlippedStatCard from '@/components/dashboard/flippedCard.vue'
import { Bar, Pie, Line, Doughnut } from 'vue-chartjs'
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
} from 'chart.js'
// Register Chart.js components
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
)

const router = useRouter()
const auth = getAuth()
const user = ref(auth.currentUser)
const userId = computed(() => user.value?.uid || null)

// State variables
const userFoodScore = ref(0);
const foodItems = ref([])
const recipes = ref([])
const activities = ref([])
const activitiesLoaded = ref(false)

const searchText = ref('')
const selectedCategory = ref('All Categories')
const sortBy = ref('expiration')
const sortDirection = ref('asc')

const showEditModal = ref(false)
const showAddModal = ref(false)
const showDeleteModal = ref(false)
const showUseModal = ref(false)
const showToast = ref(false)
const toastMessage = ref('')
const overviewCollapsed = ref(false)

const editForm = reactive({
  id: null,
  name: '',
  category: '',
  expirationDate: '',
  createdAt: '',
  price: '',
  quantity: '',
  unit: '',
})

const editFormOriginal = ref(null)

const addForm = reactive({
  name: '',
  category: '',
  expirationDate: '',
  createdAt: '',
  price: '',
  quantity: '',
  unit: '',
})

const useForm = reactive({
  id: null,
  name: '',
  quantity: 0,
  unit: '',
  maxQuantity: 0,
})

const deleteTarget = ref(null)

// Activity filter and sort controls
const activityTypeFilter = ref('All')
const activitySortDirection = ref('desc')
const activityTimeFrame = ref('all')

const activityTypeOptions = [
  { label: 'All', value: 'All' },
  { label: 'Added', value: 'addFood' },
  { label: 'Consumed', value: 'conFood' },
  { label: 'Expired', value: 'expFood' },
  { label: 'Donated', value: 'donFood' },
  { label: 'Pending Donation', value: 'pendingDonFood' },
]

const activityTimeFrameOptions = [
  { label: 'All', value: 'all' },
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
]

// Categories
const categories = [
  'All Categories',
  'Fruits & Vegetables',
  'Dairy & Eggs',
  'Meat & Poultry',
  'Seafood',
  'Snacks',
  'Beverages',
  'Condiments & Sauces',
  'Canned & Jarred Goods',
  'Frozen Foods',
  'Grains & Pasta',
  'Herbs & Spices',
  'Breakfast & Cereal',
  'Other',
]

const categoryUnits = {
  'All Categories': [
    'piece(s)',
    'kg(s)',
    'gram(s)',
    'liter(s)',
    'milliliter(s)',
    'pack(s)',
    'bag(s)',
    'box(es)',
    'bottle(s)',
    'can(s)',
  ],
  'Fruits & Vegetables': ['piece(s)', 'kg(s)', 'gram(s)', 'bag(s)', 'bunch(es)', 'lb(s)'],
  'Dairy & Eggs': ['liter(s)', 'milliliter(s)', 'dozen(s)', 'piece(s)', 'carton(s)', 'gram(s)'],
  'Meat & Poultry': ['kg(s)', 'gram(s)', 'lb(s)', 'ounce(s)', 'pack(s)', 'piece(s)'],
  Seafood: ['kg(s)', 'gram(s)', 'lb(s)', 'ounce(s)', 'piece(s)', 'pack(s)'],
  Snacks: ['piece(s)', 'gram(s)', 'pack(s)', 'bag(s)', 'box(es)', 'lb(s)'],
  Beverages: ['liter(s)', 'milliliter(s)', 'bottle(s)', 'can(s)', 'pack(s)', 'gallon(s)'],
  'Condiments & Sauces': ['milliliter(s)', 'liter(s)', 'jar(s)', 'bottle(s)', 'gram(s)', 'ounce(s)'],
  'Canned & Jarred Goods': ['can(s)', 'jar(s)', 'gram(s)', 'ounce(s)', 'pack(s)'],
  'Frozen Foods': ['kg(s)', 'gram(s)', 'pack(s)', 'bag(s)', 'box(es)', 'lb(s)'],
  'Grains & Pasta': ['kg(s)', 'gram(s)', 'lb(s)', 'bag(s)', 'box(es)', 'pack(s)'],
  'Herbs & Spices': ['gram(s)', 'ounce(s)', 'jar(s)', 'bottle(s)', 'bunch(es)', 'piece(s)'],
  'Breakfast & Cereal': ['box(es)', 'bag(s)', 'pack(s)', 'kg(s)', 'gram(s)', 'bottle(s)'],
  Other: ['piece(s)', 'unit(s)', 'pack(s)', 'box(es)', 'kg(s)', 'gram(s)'],
}
// Build charts and leaderboard from the local `activities` ref using shared builders
const wasteVsSavingsData = computed(() => buildWasteVsSavingsData(activities.value || []))
const basePie = computed(() => buildWasteByCategoryChart(activities.value || [], WASTE_COLORS))
const chartDataStyled = computed(() => styleAsRing(basePie.value))
const leaderboardMessage = computed(() => leaderboardNudge(activities.value || []))
const allLegendItems = computed(() => createAllLegendItems(chartDataStyled.value));
// Functions
function showToastFor(msg, ms = 2200) {
  toastMessage.value = msg
  showToast.value = true
  setTimeout(() => (showToast.value = false), ms)
}

function goToRecipes(food) {
  router.push({ path: '/recipes', query: { search: food.name } })
}

async function loadFoodItems() {
  if (userId.value) {
    const foodItemsRef = collection(db, 'user', userId.value, 'foodItems')
    const foodItemsSnapshot = await getDocs(foodItemsRef)
    foodItems.value = foodItemsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  }
}

async function loadActivities() {
  if (userId.value) {
    const activityRef = collection(db, 'user', userId.value, 'activities')
    const activitySnapshot = await getDocs(activityRef)
    activities.value = activitySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    activitiesLoaded.value = true
  }
}

// Helper function to calculate score change for an activity
const calculateScoreChange = (activityType, price, quantity = 1, isDonation = false) => {
  price = Number(price) || 0;
  quantity = Number(quantity) || 1;

  switch (activityType) {
    case 'conFood': // Consumed/Saved
      return (0.4 * quantity) + (0.2 * price); // +0.4 per item, +0.2*total_value for money
    case 'expFood': // Expired/Wasted
      return -((0.6 * quantity) + (0.2 * price)); // -0.6 per item, -0.2*total_value for money, wasting food should bear heaviest weightage
    case 'donFood': // Donated
      return (0.4 * quantity) + (0.2 * price) + (0.5 * quantity); // +0.4 per item, +0.2*total_value, +0.5 per item donated. Bears higher weightage to encourage donation
    default:
      return 0;
  }
};

// Helper function to update food score in Firebase
const updateFoodScore = async (activityType, price, uid, quantity = 1, isDonation = false) => {
  if (!uid) return { newScore: null, pointsEarned: 0 };

  try {
    const userDocRef = doc(db, 'user', uid);
    const streakDays = calculateActivityStreak();
    const streakMultiplier = streakDays > 0 ? (1 + streakDays / 7) : 1;

    // Calculate base score change
    const baseScoreChange = calculateScoreChange(activityType, price, quantity, isDonation);

    // Apply streak multiplier
    const adjustedChange = (baseScoreChange * streakMultiplier);

    // Get current score from Firebase (or initialize to 0)
    const currentDoc = await getDoc(userDocRef);
    const currentScore = currentDoc.exists() ? (currentDoc.data().foodScore || 0) : 0;

    const newScore = Math.round(Math.max(0, currentScore + adjustedChange));

    await updateDoc(userDocRef, {
      foodScore: newScore,
      streak: streakDays
    });

    return { newScore, pointsEarned: adjustedChange };
  } catch (err) {
    console.error('Failed to update foodScore:', err);
    return { newScore: null, pointsEarned: 0 };
  }
};

// Auth state changed
auth.onAuthStateChanged((u) => {
  user.value = u
})

// Watch userId changes
// Watch userId changes and load user's food score
watch(userId, async (val) => {
  if (val) {
    await loadFoodItems()

    const recipesRef = collection(db, 'user', val, 'recipes')
    const recipesSnapshot = await getDocs(recipesRef)
    recipes.value = recipesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    await loadActivities()

    // Load user's food score from Firebase
    try {
      const userDocRef = doc(db, 'user', val);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        userFoodScore.value = userDoc.data().foodScore || 0;
      }
    } catch (err) {
      console.error('Failed to load food score:', err);
    }
  } else {
    foodItems.value = []
    recipes.value = []
    activities.value = []
    userFoodScore.value = 0
  }
}, { immediate: true })

// Watch for expired foods and donations
// Watch for expired foods
watchEffect(async () => {
  if (!activitiesLoaded.value) return
  const uid = userId.value
  if (!uid) return

  // Handle expired foods
  const expiredFoods = foodItems.value.filter((food) => getDaysLeft(food) < 0)
  for (const food of expiredFoods) {
    const alreadyLogged = activities.value.some(
      (a) => a.foodName === food.name && a.activityType === 'expFood',
    )
    if (!alreadyLogged) {
      const actRef = collection(db, 'user', uid, 'activities')
      const q = query(
        actRef,
        where('foodName', '==', food.name),
        where('activityType', '==', 'expFood'),
      )
      const snapshot = await getDocs(q)
      if (snapshot.empty) {
        // Calculate points BEFORE creating activity
        const foodPrice = food.price || 0
        const foodQty = food.quantity || 1
        const { newScore, pointsEarned } = await updateFoodScore('expFood', food.price, uid, food.quantity);
        if (newScore !== null) {
          userFoodScore.value = newScore;
        }

        const payload = {
          activityType: 'expFood',
          createdAt: new Date().toISOString(),
          foodName: food.name || '',
          category: food.category || 'Other',
          price: String(food.price || ''),
          quantity: String(food.quantity || ''),
          unit: String(food.unit || ''),
          note: 'expired',
          pointsEarned: pointsEarned // ← ADD THIS LINE
        }
        const docRef = await addDoc(actRef, payload)
        activities.value.unshift({
          id: docRef.id,
          ...payload,
        })
      }
    }
  }
})

// Utility functions
const toInputDateString = (d) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const formatDate = (dateObj) => {
  let date
  if (dateObj) {
    if (typeof dateObj.toDate === 'function') {
      date = dateObj.toDate()
    } else if (dateObj instanceof Date) {
      date = dateObj
    } else {
      date = new Date(dateObj)
    }
  } else {
    return ''
  }

  if (isNaN(date)) return ''

  const day = String(date.getDate()).padStart(2, '0')
  const month = date.toLocaleString('en-US', { month: 'short' })
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

const getRelativeTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

const getDaysLeft = (food) => {
  const now = new Date()
  let expDate

  if (food.expirationDate) {
    if (typeof food.expirationDate.toDate === 'function') {
      expDate = food.expirationDate.toDate()
    } else if (food.expirationDate instanceof Date) {
      expDate = food.expirationDate
    } else {
      expDate = new Date(food.expirationDate)
    }
  } else {
    return 0
  }

  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const expMidnight = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate())
  return Math.floor((expMidnight - nowMidnight) / (1000 * 60 * 60 * 24))
}

const getFoodCardClass = (food) => {
  const now = new Date()
  let expDate

  if (food.expirationDate) {
    if (typeof food.expirationDate.toDate === 'function') {
      expDate = food.expirationDate.toDate()
    } else if (food.expirationDate instanceof Date) {
      expDate = food.expirationDate
    } else {
      expDate = new Date(food.expirationDate)
    }
  } else {
    return 'normal-card'
  }

  if (isNaN(expDate)) return 'normal-card'

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
const getActivityIcon = (type) => {
  const icons = {
    'donFood': 'bi bi-heart-fill',
    'pendingDonFood': 'bi bi-clock-history',
    'addFood': 'bi bi-plus-circle-fill',
    'conFood': 'bi bi-check-circle-fill',
    'expFood': 'bi bi-x-circle-fill'
  }
  return icons[type] || 'bi bi-circle-fill'
}
const getActivityTitle = (type) => {
  const titles = {
    'donFood': 'Food Donated',
    'pendingDonFood': 'Donation Pending',
    'addFood': 'Food Added',
    'conFood': 'Food Consumed',
    'expFood': 'Food Expired'
  }
  return titles[type] || 'Activity'
}
const getActivityGradient = (type) => {
  const gradients = {
    'donFood': 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    'pendingDonFood': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    'addFood': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    'conFood': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    'expFood': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
  }
  return gradients[type] || 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
}
const calculateActivityStreak = () => {
  if (!activitiesLoaded.value || activities.value.length === 0) return 0

  const activityDates = [
    ...new Set(
      activities.value
        .map((a) => {
          const date = new Date(a.createdAt)
          return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
        })
        .filter((timestamp) => !isNaN(timestamp)),
    ),
  ].sort((a, b) => b - a)

  if (activityDates.length === 0) return 0

  const today = new Date()
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const oneDayMs = 24 * 60 * 60 * 1000

  let streak = 0
  let expectedDate = todayMidnight

  if (activityDates[0] < todayMidnight - oneDayMs) {
    return 0
  }

  for (const activityDate of activityDates) {
    if (activityDate === expectedDate || activityDate === expectedDate - oneDayMs) {
      streak++
      expectedDate = activityDate - oneDayMs
    } else {
      break
    }
  }

  return streak
}

// Computed properties
const availableUnits = computed(() => {
  const category = editForm.category || addForm.category || 'All Categories'
  return categoryUnits[category] || categoryUnits['All Categories']
})

const filteredFoodItems = computed(() => {
  const uniqueItems = foodItems.value.filter(
    (item, index, self) => index === self.findIndex((i) => i.id === item.id),
  )

  let items = [...uniqueItems]

  items = items.filter((item) => item.name && item.name.trim().length > 0)

  if (searchText.value && searchText.value.trim()) {
    const searchTerm = searchText.value.toLowerCase().trim()
    items = items.filter((item) => item.name.toLowerCase().includes(searchTerm))
  }

  if (selectedCategory.value && selectedCategory.value !== 'All Categories') {
    items = items.filter((item) => item.category === selectedCategory.value)
  }

  const direction = sortDirection.value === 'desc' ? -1 : 1

  switch (sortBy.value) {
    case 'expiration':
      items.sort((a, b) => {
        function parseDate(val) {
          if (!val) return null
          if (typeof val.toDate === 'function') return val.toDate()
          if (val instanceof Date) return val
          const d = new Date(val)
          return isNaN(d.getTime()) ? null : d
        }
        const dateA = parseDate(a.expirationDate)
        const dateB = parseDate(b.expirationDate)

        if (!dateA && !dateB) return 0
        if (!dateA) return 1
        if (!dateB) return -1

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

const filteredSortedActivities = computed(() => {
  let acts = [...activities.value]

  if (activityTypeFilter.value && activityTypeFilter.value !== 'All') {
    acts = acts.filter((a) => a.activityType === activityTypeFilter.value)
  }

  if (activityTimeFrame.value && activityTimeFrame.value !== 'all') {
    const now = new Date()
    let cutoff
    if (activityTimeFrame.value === '24h') {
      cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    } else if (activityTimeFrame.value === '7d') {
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (activityTimeFrame.value === '30d') {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
    acts = acts.filter((a) => {
      const d = new Date(a.createdAt)
      return d >= cutoff
    })
  }

  acts.sort((a, b) => {
    const dateA = new Date(a.createdAt)
    const dateB = new Date(b.createdAt)
    if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0
    if (isNaN(dateA.getTime())) return activitySortDirection.value === 'desc' ? 1 : -1
    if (isNaN(dateB.getTime())) return activitySortDirection.value === 'desc' ? -1 : 1
    return activitySortDirection.value === 'desc' ? dateB - dateA : dateA - dateB
  })
  return acts
})

const expiringSoon = computed(
  () =>
    foodItems.value.filter((food) => {
      const daysLeft = getDaysLeft(food)
      return daysLeft >= 0 && daysLeft <= 5
    }).length,
)

const expired = computed(() => {
  return activities.value.filter(a => a.activityType === 'expFood').length
})

const potentialLoss = computed(() =>
  foodItems.value
    .filter((item) => {
      const days = getDaysLeft(item)
      return days >= 0 && days <= 7
    })
    .reduce((sum, item) => sum + (item.price || 0), 0),
)

const analytics = computed(() => {
  const wasteActivities = activities.value.filter((a) => a.activityType === 'expFood')
  const usedActivities = activities.value.filter((a) => a.activityType === 'conFood')
  const donatedActivities = activities.value.filter((a) => a.activityType === 'donFood')
  const pendingDonations = activities.value.filter((a) => a.activityType === 'pendingDonFood')
  const inventoryActivities = foodItems.value.filter((food) => getDaysLeft(food) > 0)
  const totalWasteItems = wasteActivities.length
  const totalWasteMoney = wasteActivities.reduce((total, activity) => {
    return total + Number(activity.price)
  }, 0)

  const totalSavedItems = activities.value.filter(
    (a) => (a.activityType === 'conFood' && a.note === 'fully consumed') ||
      (a.activityType === 'donFood')
  ).length

  const totalSavedMoney = usedActivities.reduce((total, activity) => {
    return total + Number(activity.price)
  }, 0) + donatedActivities.reduce((total, activity) => {
    return total + Number(activity.price)
  }, 0)

  const totalItemsHandled = totalWasteItems + totalSavedItems
  const reductionPercentage =
    totalItemsHandled > 0 ? Math.round((totalSavedItems / totalItemsHandled) * 100) : 0

  const inventoryValue = inventoryActivities.reduce((sum, item) => {
    const price = Number(item.price) || 0
    return sum + price
  }, 0)
  const inventoryItems = inventoryActivities.length

  const streakDays = calculateActivityStreak()
  const foodDonated = donatedActivities.length

  return {
    totalWaste: { money: totalWasteMoney, items: totalWasteItems },
    totalSaved: { money: totalSavedMoney, items: totalSavedItems },
    reduction: reductionPercentage,
    inventory: { value: inventoryValue, items: inventoryItems },
    streakDays: streakDays,
    foodDonated: foodDonated,
    pendingDonations: pendingDonations.length,
  }
})




const toggleSortDirection = () => {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
}

// Convert string to Title Case (e.g., "baby spinach" -> "Baby Spinach")
const titleCase = (str) => {
  if (!str || typeof str !== 'string') return ''
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const applyTitleCase = () => {
  addForm.name = titleCase(addForm.name || '')
}

// Live input handler for addForm.name that title-cases as user types.
const onAddNameInput = (event) => {
  // Preserve cursor position (best-effort)
  const el = event.target
  const start = el.selectionStart
  const end = el.selectionEnd
  const raw = el.value || ''
  // Live title-casing that preserves all original spaces (including trailing)
  // Use regex to transform only non-space runs so user can type spaces freely.
  const transformed = raw.replace(/\S+/g, (w) => {
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  })

  // Update model when needed. If nothing changed, still keep model in sync.
  if (transformed !== raw) {
    addForm.name = transformed
    // restore cursor (best-effort)
    setTimeout(() => {
      try {
        el.selectionStart = start
        el.selectionEnd = end
      } catch (e) {
        // ignore
      }
    }, 0)
  } else {
    addForm.name = raw
  }
}

const applyTitleCaseEdit = () => {
  editForm.name = titleCase(editForm.name || '')
}

// Live input handler for editForm.name that mirrors the addForm behavior
const onEditNameInput = (event) => {
  const el = event.target
  const start = el.selectionStart
  const end = el.selectionEnd
  const raw = el.value || ''

  const transformed = raw.replace(/\S+/g, (w) => {
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  })

  if (transformed !== raw) {
    editForm.name = transformed
    setTimeout(() => {
      try {
        el.selectionStart = start
        el.selectionEnd = end
      } catch (e) {
        // ignore
      }
    }, 0)
  } else {
    editForm.name = raw
  }
}

const getSortButtonIcon = computed(() => {
  return sortDirection.value === 'asc' ? 'bi bi-sort-up' : 'bi bi-sort-down'
})

const getSortButtonTitle = computed(() => {
  const direction = sortDirection.value === 'asc' ? 'Ascending' : 'Descending'
  return `Sort ${direction}`
})

// Modal functions
const openUse = (food) => {
  // Prevent using expired food
  if (getDaysLeft(food) < 0) {
    showToastFor(`${food.name} is expired and cannot be used.`)
    return
  }
  useForm.id = food.id
  useForm.name = food.name
  useForm.quantity = 1
  useForm.unit = food.unit || ''
  useForm.maxQuantity = food.quantity
  showUseModal.value = true
}

const closeUse = () => {
  showUseModal.value = false
  useForm.id = null
  useForm.name = ''
  useForm.quantity = 0
  useForm.unit = ''
  useForm.maxQuantity = 0
}

const saveUse = async () => {
  if (!useForm.id || useForm.quantity <= 0) return

  const uid = userId.value
  if (!uid) return

  try {
    const foodIndex = foodItems.value.findIndex((f) => f.id === useForm.id)
    if (foodIndex === -1) return

    const food = foodItems.value[foodIndex]
    const usedQty = Math.min(useForm.quantity, food.quantity)
    const newQty = food.quantity - usedQty

    const totalPrice = food.price || 0
    const pricePerUnit = totalPrice / (food.quantity || 1)
    const usedValue = pricePerUnit * usedQty
    const remainingValue = pricePerUnit * newQty

    const refDoc = doc(db, 'user', uid, 'foodItems', useForm.id)
    const actRef = collection(db, 'user', uid, 'activities')

    // Calculate points BEFORE creating activity
    const { newScore, pointsEarned } = await updateFoodScore('conFood', usedValue, uid, usedQty);
    if (newScore !== null) {
      userFoodScore.value = newScore;
    }

    // ADD pointsEarned to the activity payload
    const activityPayload = {
      activityType: 'conFood',
      createdAt: new Date().toISOString(),
      foodName: food.name,
      category: food.category || '',
      price: String(pricePerUnit),
      quantity: String(usedQty),
      unit: food.unit || '',
      pointsEarned: pointsEarned // ← ADD THIS LINE
    }
    const docRef = await addDoc(actRef, activityPayload)
    activities.value.unshift({
      id: docRef.id,
      ...activityPayload,
    })

    if (newQty <= 0) {
      await deleteDoc(refDoc)
      foodItems.value.splice(foodIndex, 1)

      // Calculate points for fully consumed
      const { pointsEarned: fullPoints } = await updateFoodScore('conFood', 0, uid, 0);

      const fullConsumedPayload = {
        activityType: 'conFood',
        createdAt: new Date().toISOString(),
        foodName: food.name,
        category: food.category || '',
        price: String(pricePerUnit),
        quantity: String(usedQty),
        unit: food.unit || '',
        note: 'fully consumed',
        pointsEarned: fullPoints // ← ADD THIS LINE
      }
      const docRef2 = await addDoc(actRef, fullConsumedPayload)
      activities.value.unshift({
        id: docRef2.id,
        ...fullConsumedPayload,
      })

      showToastFor(`${food.name} fully consumed and removed`)
    } else {
      await updateDoc(refDoc, { quantity: newQty, price: remainingValue })
      foodItems.value[foodIndex].quantity = newQty
      foodItems.value[foodIndex].price = remainingValue
      await success(`Consumed ${usedQty} ${food.unit} of ${food.name}`)
      showToastFor(`Used ${usedQty} ${food.unit} of ${food.name}`)
    }
    closeUse()
  } catch (err) {
    console.error('Failed to log used food:', err)
    await error('Failed to update food usage.')
    showToastFor('Failed to update food usage.')
  }
}

const openAdd = () => {
  addForm.name = ''
  addForm.category = ''
  addForm.expirationDate = ''
  addForm.createdAt = toInputDateString(new Date())
  addForm.price = ''
  addForm.quantity = ''
  addForm.unit = ''
  showAddModal.value = true
}

const closeAdd = () => {
  showAddModal.value = false
  addForm.name = ''
  addForm.category = ''
  addForm.expirationDate = ''
  addForm.createdAt = ''
  addForm.price = ''
  addForm.quantity = ''
  addForm.unit = ''
}

const saveAdd = async () => {
  if (!userId.value) {
    console.warn('No userId available; cannot add food item')
    return
  }

  // Ensure the name is title-cased before saving
  applyTitleCase()
  const nameValue = addForm.name || ''

  const colRef = collection(db, 'user', userId.value, 'foodItems')
  const actRef = collection(db, 'user', userId.value, 'activities')

  const foodPayload = {
    name: nameValue,
    category: addForm.category || '',
    price: (Number(addForm.price) || 0) * (Number(addForm.quantity) || 1),
    quantity: Number(addForm.quantity) || 0,
    unit: addForm.unit || '',
    createdAt: addForm.createdAt
      ? Timestamp.fromDate(new Date(addForm.createdAt))
      : Timestamp.fromDate(new Date()),
  }

  if (addForm.expirationDate) {
    foodPayload.expirationDate = Timestamp.fromDate(new Date(addForm.expirationDate))
  }

  try {
    const newDocRef = await addDoc(colRef, foodPayload)

    const activityPayload = {
      activityType: 'addFood',
      createdAt: new Date().toISOString(),
      foodName: nameValue,
      category: addForm.category || '',
      price: String(addForm.price || ''),
      quantity: String(addForm.quantity || ''),
      unit: String(addForm.unit || ''),
    }

    const activityDocRef = await addDoc(actRef, activityPayload)

    foodItems.value.unshift({ id: newDocRef.id, ...foodPayload })

    activities.value.unshift({
      id: activityDocRef.id,
      ...activityPayload,
    })

    showToastFor('Food item added and activity logged!')
    closeAdd()
    await success('Food Added Successfully')
  } catch (error) {
    console.error('Error adding food item or activity:', error)
    showToastFor('Failed to add food item.')
    await error('Failed to add food')
  }
}

const openEdit = (food) => {
  // Prevent editing expired food
  if (getDaysLeft(food) < 0) {
    showToastFor(`${food.name} is expired and cannot be edited.`)
    return
  }
  editFormOriginal.value = JSON.parse(JSON.stringify(food))
  editForm.id = food.id || null
  editForm.name = food.name ?? ''
  editForm.category = food.category ?? ''
  let exp = null
  if (food.expirationDate) {
    if (typeof food.expirationDate.toDate === 'function') {
      exp = food.expirationDate.toDate()
    } else {
      exp = new Date(food.expirationDate)
      if (isNaN(exp)) exp = null
    }
  }
  editForm.expirationDate = exp ? toInputDateString(exp) : ''
  const created =
    food.createdAt && food.createdAt.toDate
      ? food.createdAt.toDate()
      : food.createdAt
        ? new Date(food.createdAt)
        : null
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
  const refDoc = doc(db, 'user', userId.value, 'foodItems', editForm.id)
  const payload = {
    name: editForm.name,
    category: editForm.category,
    price: (Number(editForm.price) || 0) * (Number(editForm.quantity) || 1),
    quantity: Number(editForm.quantity) || 0,
    unit: editForm.unit || '',
  }
  if (editForm.expirationDate) {
    payload.expirationDate = Timestamp.fromDate(new Date(editForm.expirationDate))
  }
  if (editForm.createdAt) {
    payload.createdAt = Timestamp.fromDate(new Date(editForm.createdAt))
  }
  await updateDoc(refDoc, payload)
  const idx = foodItems.value.findIndex((f) => f.id === editForm.id)
  if (idx !== -1) {
    foodItems.value[idx] = { ...foodItems.value[idx], ...payload }
  }
  await success('Successfully Edited')
  closeEdit()
}

const deleteFood = async (food) => {
  if (!food || food.id == null) return
  try {
    const uid = userId.value
    if (!uid) {
      console.warn('Not logged in')
      return false
    }
    const refDoc = doc(db, 'user', uid, 'foodItems', food.id)
    await deleteDoc(refDoc)

    const actRef = collection(db, 'user', uid, 'activities')
    const q = query(
      actRef,
      where('foodName', '==', food.name),
      where('activityType', '==', 'addFood'),
    )
    const actSnapshot = await getDocs(q)

    const deletePromises = []
    actSnapshot.forEach((docSnap) => {
      deletePromises.push(deleteDoc(docSnap.ref))
    })
    await Promise.all(deletePromises)

    const idx = foodItems.value.findIndex((f) => f.id === food.id)
    if (idx !== -1) foodItems.value.splice(idx, 1)

    activities.value = activities.value.filter(
      (a) => !(a.foodName === food.name && a.activityType === 'addFood'),
    )
    await success('Successfully Deleted')
    return true
  } catch (err) {
    console.error('Failed to delete food and its activity log:', err)
    return false
  }
}

const openDelete = (food) => {
  deleteTarget.value = food || null
  showDeleteModal.value = true
}

const closeDelete = () => {
  showDeleteModal.value = false
  deleteTarget.value = null
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  const ok = await deleteFood(deleteTarget.value)
  closeDelete()
  if (ok) showToastFor('Item deleted')
  else showToastFor('Failed to delete')
}
</script>

<template>
  <div class="container-fluid p-4">
    <div class="dashboard-overview">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 class="h2 mb-2 fw-bold">Dashboard</h1>
          <p class="text-muted mb-0">Track your food inventory and reduce waste</p>
        </div>
        <div class="ms-3">
          <div style="transform: rotateY(9.20483deg)">
            <button @click="overviewCollapsed = !overviewCollapsed" :aria-expanded="!overviewCollapsed"
              class="btn btn-sm btn-outline-secondary header-collapse-btn">
              <i :class="overviewCollapsed ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"></i>
              <span class="visually-hidden">Toggle overview rows</span>
            </button>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-3">
        <div class="col-6 col-lg-3">
          <FlippedStatCard
            title="Food Score"
            iconClass="bi bi-graph-up-arrow"
            :gradient="`linear-gradient(135deg, rgba(0, 102, 60, 0.85) 0%, rgba(50, 200, 120, 0.6) 100%)`"
            height="130px"
          >
            <!-- FRONT content -->
            <template #default>
              <h3 class="fw-bold mb-0 text-white">{{ userFoodScore }}</h3>
              <small class="text-white">points</small>

              <!-- Streak badge -->
              <div v-if="analytics.streakDays > 0" class="mt-2">
                <span
                  class="streak-fire"
                  :class="{
                    'fire-small': analytics.streakDays < 7,
                    'fire-medium': analytics.streakDays >= 7 && analytics.streakDays < 14,
                    'fire-large': analytics.streakDays >= 14
                  }"
                >🔥</span>
                <span class="streak-text text-white">
                  {{ analytics.streakDays }} day{{ analytics.streakDays !== 1 ? 's' : '' }} streak
                </span>
              </div>
            </template>

            <!-- BACK content -->
            <template #back>
              <p class="mb-0 text-white small text-center mt-2" style="font-size:10px">
                Rewards when food is consumed and money saved,
                penalizes waste, and adds bonus points for food donations
              </p>
            </template>
          </FlippedStatCard>
        </div>
        <div class="col-6 col-lg-3">
          <div class="position-relative p-3 rounded-4 text-white shadow d-flex flex-column justify-content-between"
            style="
              background: linear-gradient(
                135deg,
                rgba(0, 74, 173, 0.85) 0%,
                rgba(59, 130, 246, 0.65) 100%
              );
              box-shadow: 0 6px 14px rgba(0, 0, 0, 0.1);
              height: 130px;
            ">
            <!-- Left: Icon + label -->
            <div class="position-absolute top-50 start-0 translate-middle-y ms-3 d-flex flex-column align-items-center"
              style="width: 90px">
              <div
                class="rounded-circle bg-white bg-opacity-25 d-flex justify-content-center align-items-center mb-1 p-2"
                style="width: 56px; height: 56px">
                <i class="bi bi-exclamation-triangle fs-5 text-white"></i>
              </div>
              <small class="text-white text-center">Expiring Soon</small>
            </div>

            <!-- Right: Count -->
            <div class="text-end align-self-end pe-2 mt-2 position-relative">
              <h3 class="fw-bold mb-0 text-white">{{ expiringSoon }}</h3>
              <small class="text-white">items</small>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
         <FlippedStatCard
            title="Potential Loss"
            iconClass="bi bi-currency-dollar"
            :gradient="`linear-gradient(135deg, rgba(153, 27, 27, 0.9) 0%, rgba(239, 68, 68, 0.65) 100%)`"
            height="130px"
          >
            <!-- FRONT content -->
            <template #default>
              <h3 class="fw-bold mb-0 text-white">${{ potentialLoss.toFixed(2) }}</h3>
              <small class="text-white">if expired</small>
            </template>

            <!-- BACK content -->
            <template #back>
              <p class="mb-0 text-white small text-center mt-3 mt-md-4" style="font-size:10px">
                Measures the total value of food that’s at risk of expiring within the next 7 days.
              </p>
            </template>
          </FlippedStatCard>
        </div>
        <div class="col-6 col-lg-3">
          <div class="position-relative p-3 rounded-4 text-white shadow d-flex flex-column justify-content-between"
            style="
              background: linear-gradient(
                135deg,
                rgba(202, 84, 0, 0.9) 0%,
                rgba(249, 115, 22, 0.65) 100%
              );
              box-shadow: 0 6px 14px rgba(0, 0, 0, 0.1);
              height: 130px;
            ">
            <!-- Left: Icon + label -->
            <div class="position-absolute top-50 start-0 translate-middle-y ms-3 d-flex flex-column align-items-center"
              style="width: 90px">
              <div
                class="rounded-circle bg-white bg-opacity-25 d-flex justify-content-center align-items-center mb-1 p-2"
                style="width: 56px; height: 56px">
                <i class="bi bi-calendar-x fs-5 text-white"></i>
              </div>
              <small class="text-white text-center">Expired</small>
            </div>

            <!-- Right: Count -->
            <div class="text-end align-self-end pe-2 mt-2 position-relative">
              <h3 class="fw-bold mb-0 text-white">{{ expired }}</h3>
              <small class="text-white">items</small>
            </div>
          </div>
        </div>
      </div>
      <!-- Charts Section -->
      <div class="row g-4 mb-3" v-show="overviewCollapsed">
        <div class="col-lg-8">
          <div class="glass-card p-4 charts-left-card h-100 d-flex flex-column">
            <div class="row g-0">
              <!-- Left panel -->
              <div class="col-md-4">
                <div class="card shadow-sm h-100 position-relative overflow-visible leaderboard-card">

                  <div class="card-body text-center pt-4">
                    <!-- Icon Circle -->
                    <div
                      class="d-flex align-items-center justify-content-center mx-auto mb-3 rounded-circle icon-circle-hover"
                      style="width: 80px; height: 80px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #f59e0b; transition: all 0.3s ease;">
                      <i class="bi bi-trophy fs-1"></i>
                    </div>

                    <!-- Title -->
                    <h6 class="fw-bold mb-3 title-hover" style="font-size: 1.25rem; transition: color 0.3s ease;">
                      Leaderboard Insights
                    </h6>

                    <!-- Description -->
                    <p class="text-secondary small mb-0 lh-base">
                      {{ leaderboardMessage }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Right panel -->
              <div class="col-md-8 p-3 p-md-4">
                <div class="d-flex align-items-center justify-content-between mb-3">
                  <h5 class="mb-0 fw-bold">
                    <i class="bi bi-activity me-2"></i>
                    Waste vs Savings
                  </h5>
                  <div class="d-flex align-items-center small fw-semibold">
                    <span class="me-3 d-inline-flex align-items-center">
                      <span class="me-2" style="width:10px; height:10px; border-radius:50%; background: #FFA449"></span>
                      Savings
                    </span>
                    <span class="d-inline-flex align-items-center">
                      <span class="me-2"
                        style="width:10px; height:10px; border-radius:50%; background: #7B61FF;"></span>
                      Waste
                    </span>
                  </div>
                </div>
                <div style="height:220px">
                  <Line :data="wasteVsSavingsData" :options="wasteVsSavingsOpts" />
                </div>
              </div>
            </div>

            <!-- Bottom KPI row -->
            <div class="row g-3 mt-3 border-top">
              <!-- Total Waste -->
              <div class="col-6 col-xl-3">
                <div class="d-flex align-items-center">
                  <div class="rounded-3 d-flex justify-content-center align-items-center flex-shrink-0 me-3"
                    style="width: 48px; height: 48px; background-color: rgba(239, 68, 68, 0.1); color: #ef4444;">
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
                  <div class="rounded-3 d-flex justify-content-center align-items-center flex-shrink-0 me-3"
                    style="width: 48px; height: 48px; background-color: rgba(16, 185, 129, 0.1); color: #10b981;">
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
                  <div class="rounded-3 d-flex justify-content-center align-items-center flex-shrink-0 me-3"
                    style="width: 48px; height: 48px; background-color: rgba(37, 99, 235, 0.1); color: #2563eb;">
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
                  <div class="rounded-3 d-flex justify-content-center align-items-center flex-shrink-0 me-3"
                    style="width: 48px; height: 48px; background-color: rgba(249, 115, 22, 0.1); color: #f97316;">
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
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card border-0 shadow-sm p-4" style="border-radius: 16px;">
  <h5 class="mb-4 fw-bold text-dark">
    <i class="bi bi-pie-chart me-2"></i>
    Waste by Category
  </h5>
  
  <!-- Chart Container with Total in Center -->
  <div class="position-relative mx-auto mb-4" style="width: 240px; height: 300px;" v-if="chartDataStyled.datasets[0].data.length">
    <Pie :data="chartDataStyled" :options="wasteRingOpts" :plugins="[centerTextPlugin]" />
    
    <!-- Dynamic Percentage Labels Outside Ring -->
    <div v-for="(item, i) in allLegendItems" :key="i" 
     class="position-absolute"
     :style="getPercentageLabelPosition(i, allLegendItems)">
  <div class="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold shadow-lg percentage-badge"
           :style="{ 
             width: '56px', 
             height: '56px', 
             background: `linear-gradient(135deg, ${item.color} 0%, ${darkenColor(item.color, 20)} 100%)`,
             fontSize: '1.125rem',
             border: '2px solid white'
           }">
    {{ item.pct }}%
  </div>
</div>
  </div>
  
  <p class="text-muted small text-center my-4" v-else>No waste data yet</p>

  <!-- Dynamic Legend at Bottom -->
  <div class="d-flex flex-wrap justify-content-center gap-3 mt-3" v-if="allLegendItems.length">
    <div v-for="(item, i) in allLegendItems" :key="i" class="d-flex align-items-center gap-2">
      <span class="rounded-circle flex-shrink-0" 
            :style="{ 
              width: '16px', 
              height: '16px', 
              backgroundColor: item.color,
            }"></span>
      <span class="text-secondary small fw-medium">{{ item.label }}</span>
    </div>
  </div>
</div>
        </div>
      </div>
    </div>

    <!-- Food Inventory -->
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
              <div v-for="food in filteredFoodItems" :key="food.id" :class="[
                'food-card',
                getFoodCardClass(food),
                'd-flex',
                'flex-column',
                'justify-content-between',
              ]">
                <div>
                  <div class="food-header">
                    <div>
                      <div class="food-title-group align-items-center d-flex gap-2">
                        <span class="food-name">{{ food.name }}</span>

                        <!-- expired badge -->
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
                  <button class="food-btn food-btn-recipe px-2 py-1" style="font-size: 0.92em; min-width: 0"
                    @click.prevent="goToRecipes(food)">
                    <i class="bi bi-book"></i> Recipes
                  </button>
                  <div class="food-actions d-flex gap-2">
                    <!-- If expired, only show delete. Otherwise allow edit and consume. -->
                    <template v-if="getDaysLeft(food) < 0">
                      <button class="food-btn food-btn-delete" @click.prevent="openDelete(food)"><i
                          class="bi bi-trash"></i></button>
                    </template>
                    <template v-else>
                      <button class="food-btn food-btn-edit" @click.prevent="openEdit(food)"><i
                          class="bi bi-pencil"></i>
                        Edit</button>
                      <button class="food-btn food-btn-use" @click.prevent="openUse(food)"><i class="bi bi-check2"></i>
                        Consume</button>
                      <button class="food-btn food-btn-delete" @click.prevent="openDelete(food)"><i
                          class="bi bi-trash"></i></button>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Activities -->
      <div class="col-lg-4 d-lg-block d-flex flex-column h-100">
        <div class="glass-card p-4 d-flex flex-column flex-grow-1 h-100" style="min-height: 0">
          <h3 class="h5 mb-3 fw-bold">Recent Activity</h3>

          <div class="d-flex align-items-center justify-content-between mb-3">
            <div class="d-flex gap-2 w-100">
              <select v-model="activityTypeFilter" class="form-select form-select-sm"
                style="width: auto; min-width: 110px">
                <option disabled value="">Activity</option>
                <option v-for="opt in activityTypeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <select v-model="activityTimeFrame" class="form-select form-select-sm"
                style="width: auto; min-width: 90px">
                <option disabled value="">Time</option>
                <option v-for="opt in activityTimeFrameOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
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
            <div v-if="filteredSortedActivities.length === 0" class="text-center py-5 flex-grow-1">
              <i class="bi bi-activity display-1 text-muted opacity-25"></i>
              <p class="text-muted mt-3">No recent activity</p>
            </div>

            <div v-else class="d-flex flex-column gap-3 activity-scroll flex-grow-1"
              style="overflow-y: auto; padding-right: 8px;">
              <div v-for="activity in filteredSortedActivities" :key="activity.id" class="activity-item">
                <div class="d-flex align-items-start gap-3 position-relative">
                  <!-- Points Badge - Top Right -->
                  <div v-if="activity.pointsEarned !== undefined && activity.pointsEarned !== 0"
                    class="position-absolute top-0 end-0">
                    <span class="badge d-flex align-items-center gap-1"
                      :class="activity.pointsEarned > 0 ? 'bg-success' : 'bg-danger'" style="font-size: 0.7rem;">
                      <i :class="activity.pointsEarned > 0 ? 'bi bi-arrow-up' : 'bi bi-arrow-down'"></i>
                      {{ Math.abs(activity.pointsEarned) }} pts
                    </span>
                  </div>

                  <!-- Icon Circle -->
                  <div class="flex-shrink-0">
                    <div class="rounded-circle d-flex align-items-center justify-content-center" :style="{
                      width: '48px',
                      height: '48px',
                      background: getActivityGradient(activity.activityType)
                    }">
                      <i :class="getActivityIcon(activity.activityType)" class="text-white fs-5"></i>
                    </div>
                  </div>

                  <!-- Content -->
                  <div class="flex-grow-1 min-w-0">
                    <h6 class="mb-1 fw-bold small">{{ getActivityTitle(activity.activityType) }}</h6>

                    <!-- Activity Details -->
                    <div v-if="activity.activityType === 'donFood'" class="mb-1">
                      <p class="mb-0 small text-secondary">
                        {{ activity.quantity }} {{ activity.unit }} of {{ activity.foodName }} donated
                      </p>
                    </div>

                    <div v-else-if="activity.activityType === 'pendingDonFood'" class="mb-1">
                      <p class="mb-0 small text-secondary">
                        {{ activity.quantity }} {{ activity.unit }} of {{ activity.foodName }} pending donation
                      </p>
                    </div>

                    <div v-else-if="activity.activityType === 'addFood'" class="mb-1">
                      <p class="mb-0 small text-secondary">
                        {{ activity.quantity }} {{ activity.unit }} of {{ activity.foodName }} added
                      </p>
                    </div>

                    <div v-else-if="activity.activityType === 'conFood'" class="mb-1">
                      <p class="mb-0 small"
                        :class="activity.note === 'fully consumed' ? 'text-success fw-semibold' : 'text-secondary'">
                        <span v-if="activity.note === 'fully consumed'">
                          All of {{ activity.foodName }} fully consumed
                        </span>
                        <span v-else>
                          {{ activity.quantity }} {{ activity.unit }} of {{ activity.foodName }} consumed
                        </span>
                      </p>
                    </div>

                    <div v-else-if="activity.activityType === 'expFood'" class="mb-1">
                      <p class="mb-0 small text-danger fw-semibold">
                        {{ activity.quantity }} {{ activity.unit }} of {{ activity.foodName }} expired
                      </p>
                    </div>

                    <!-- Timestamp -->
                    <small class="text-muted d-block" style="font-size: 0.75rem;">
                      <i class="bi bi-clock me-1"></i>{{ getRelativeTime(activity.createdAt) }}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Food Modal -->
    <div v-if="showEditModal" class="modal-backdrop">
      <div class="modal-card">
        <h3 class="h5 mb-3">Edit Food Item</h3>
        <div class="mb-2">
          <label class="form-label">Name</label>
          <input v-model="editForm.name" @input="onEditNameInput" @blur="applyTitleCaseEdit" class="form-control" />
        </div>
        <div class="mb-2">
          <label class="form-label">Category</label>
          <select v-model="editForm.category" class="form-select">
            <option disabled value="">{{ editForm.category || 'Select a category' }}</option>
            <option v-for="cat in categories.filter((c) => c !== 'All Categories')" :key="cat" :value="cat">
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
        <p>
          How much of <strong>{{ useForm.name }}</strong> did you use?
        </p>

        <!-- Show available quantity alert -->
        <div class="alert alert-info py-2 mb-2" style="font-size: 0.875rem;">
          <i class="bi bi-info-circle me-2"></i>
          Available: <strong>{{ useForm.maxQuantity }} {{ useForm.unit }}</strong>
        </div>

        <div class="row g-2 mt-2">
          <div class="col-6">
            <label class="form-label">Quantity</label>
            <input v-model.number="useForm.quantity" type="number" min="1" :max="useForm.maxQuantity"
              class="form-control" :class="{ 'is-invalid': useForm.quantity > useForm.maxQuantity }"
              style="height: 45px" />
            <!-- Error message if exceeds max -->
            <div v-if="useForm.quantity > useForm.maxQuantity" class="invalid-feedback d-block">
              Cannot exceed {{ useForm.maxQuantity }} {{ useForm.unit }}
            </div>
          </div>
          <div class="col-6">
            <label class="form-label">Unit</label>
            <input v-model="useForm.unit" type="text" class="form-control" disabled style="height: 45px;" />
          </div>
        </div>

        <div class="d-flex justify-content-end gap-2 mt-3">
          <button class="btn btn-secondary" @click="closeUse">Cancel</button>
          <!-- Disable button when invalid -->
          <button class="btn btn-primary" @click="saveUse"
            :disabled="useForm.quantity <= 0 || useForm.quantity > useForm.maxQuantity">
            Use
          </button>
        </div>
      </div>
    </div>

    <!-- Floating Add Button -->
    <button class="fab-add d-flex align-items-center justify-content-center" @click="openAdd" title="Add Food">
      <i class="bi bi-plus-lg d-flex align-items-center justify-content-center fs-3"></i>
      <span class="fab-text">Add Food</span>
    </button>

    <!-- Add Modal -->
    <div v-if="showAddModal" class="modal-backdrop">
      <div class="modal-card">
        <h3 class="h5 mb-3">Add Food Item</h3>
        <div class="mb-2">
          <label class="form-label">Name</label>
          <input v-model="addForm.name" @input="onAddNameInput" @blur="applyTitleCase" class="form-control" />
        </div>
        <div class="mb-2">
          <label class="form-label">Category</label>
          <select v-model="addForm.category" class="form-select">
            <option disabled value="">Select a category</option>
            <option v-for="cat in categories.filter((c) => c !== 'All Categories')" :key="cat" :value="cat">
              {{ cat }}
            </option>
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
      <p>
        Are you sure you want to delete <strong>{{ deleteTarget?.name }}</strong>? This action cannot be undone.
      </p>
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

.activity-item {
  padding: 12px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.activity-item:hover {
  background: #f8fafc;
  border-color: #e2e8f0;
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}


@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.activity-item {
  animation: slideIn 0.3s ease-out;
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
  transition:
    background 0.2s,
    color 0.2s;
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
.percentage-badge {
  transition: all 0.3s ease;
  cursor: pointer;
  font-size: 0.875rem;
  letter-spacing: -0.5px;
}

.percentage-badge:hover {
  transform: scale(1.15) rotate(5deg);
}

.flip-card-front,
.flip-card-back {
  position: absolute;
  height: 100%;
  top: 0;
  left: 0;
  backface-visibility: hidden;
}

.flip-card {
  cursor: pointer;
  width: 100%;
  height: 130px;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.flip-card-inner.is-flipped {
  transform: rotateY(180deg);
}

.flip-card-back {
  transform: rotateY(180deg);
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
  transition:
    background 0.2s,
    color 0.2s;
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
  box-shadow: 0 6px 18px rgba(5, 150, 105, 0.25);
  cursor: pointer;
  z-index: 2500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  white-space: nowrap;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fab-add:hover {
  width: 140px;
  border-radius: 28px;
  padding-right: 20px;
}


.fab-add i {
  transition: transform 0.3s ease;
}

.fab-text {
  font-size: 16px;
  font-weight: 600;
  max-width: 0;
  opacity: 0;
  overflow: hidden;
  display: inline-block;
  white-space: nowrap;
  transform: translateX(-16px);
  transition:
    max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.25s ease,
    transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.fab-add:hover .fab-text {
  max-width: 100px;
  opacity: 1;
  transform: translateX(0);
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
  box-shadow:
    0 8px 30px rgba(229, 57, 53, 0.06),
    0 0 0 rgba(229, 57, 53, 0);
  animation: pulseRed 1.6s ease-in-out infinite;
}

@keyframes pulseRed {
  0% {
    box-shadow:
      0 8px 30px rgba(229, 57, 53, 0.06),
      0 0 0 rgba(229, 57, 53, 0);
  }

  50% {
    box-shadow:
      0 18px 60px rgba(229, 57, 53, 0.28),
      0 0 36px rgba(229, 57, 53, 0.12);
  }

  100% {
    box-shadow:
      0 8px 30px rgba(229, 57, 53, 0.06),
      0 0 0 rgba(229, 57, 53, 0);
  }
}

.overflow-visible {
  overflow: visible;
}

.leaderboard-card {
  transition: all 0.3s ease;
  border: 1px solid white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)
}

.leaderboard-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15), 0 10px 10px rgba(0, 0, 0, 0.04);
  border: 1px solid #f59e0b;
}

.leaderboard-card:hover .icon-circle:hover {
  transform: scale(1.1);
  background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%);
}

.leaderboard-card:hover .title-hover {
  color: #f59e0b;
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

/* Streak fire background animation */
.streak-fire-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.08;
  background: linear-gradient(135deg,
      rgba(251, 191, 36, 0.3) 0%,
      rgba(245, 158, 11, 0.2) 50%,
      rgba(239, 68, 68, 0.1) 100%);
  animation: fireGlow 3s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
  border-radius: inherit;
}

.streak-fire-bg.streak-hot {
  opacity: 0.12;
  animation-duration: 2s;
}

.streak-fire-bg.streak-blazing {
  opacity: 0.18;
  animation-duration: 1.5s;
  background: linear-gradient(135deg,
      rgba(239, 68, 68, 0.3) 0%,
      rgba(251, 146, 60, 0.2) 50%,
      rgba(251, 191, 36, 0.1) 100%);
}

@keyframes fireGlow {

  0%,
  100% {
    transform: scale(1);
    opacity: 0.08;
  }

  50% {
    transform: scale(1.05);
    opacity: 0.15;
  }
}

.streak-fire {
  display: inline-block;
  font-size: 1rem;
  line-height: 1;
  animation: fireFlicker 1.5s ease-in-out infinite;
}

.streak-fire.fire-small {
  font-size: 1rem;
  animation-duration: 2s;
}

.streak-fire.fire-medium {
  font-size: 1.2rem;
  animation-duration: 1.2s;
  filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.6));
}

.streak-fire.fire-large {
  font-size: 1.4rem;
  animation-duration: 0.8s;
  filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.8));
}

@keyframes fireFlicker {

  0%,
  100% {
    transform: scale(1) rotate(-2deg);
  }

  25% {
    transform: scale(1.1) rotate(2deg);
  }

  50% {
    transform: scale(0.95) rotate(-1deg);
  }

  75% {
    transform: scale(1.05) rotate(1deg);
  }
}

.streak-text {
  color: #92400e;
  font-weight: 600;
}
</style>
