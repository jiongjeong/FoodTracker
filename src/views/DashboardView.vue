<script setup>
import { useRouter } from 'vue-router';
import { db } from '../firebase.js';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, Timestamp, query, where } from 'firebase/firestore';
import { ref, computed, onMounted, reactive, watch, watchEffect } from 'vue';
import { getAuth } from 'firebase/auth';
import { Bar, Pie, Line, Doughnut  } from 'vue-chartjs'
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

// Register Chart.js components so charts render
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
function goToRecipes(food) {
  // Navigate to /recipes with a query param for search
  router.push({ path: '/recipes', query: { search: food.name } })
}
const searchText = ref('')
const selectedCategory = ref('All Categories')
const sortBy = ref('expiration')
const sortDirection = ref('asc')

const showEditModal = ref(false)
const showAddModal = ref(false)
const showDeleteModal = ref(false)
const showUseModal = ref(false)

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
})

const deleteTarget = ref(null)
const showToast = ref(false)
const toastMessage = ref('')

// Collapse state for overview lower rows
const overviewCollapsed = ref(false)

function showToastFor(msg, ms = 2200) {
  toastMessage.value = msg
  showToast.value = true
  setTimeout(() => (showToast.value = false), ms)
}

const foodItems = ref([])
const recipes = ref([])
const activities = ref([])
const activitiesLoaded = ref(false)

// Activity filter and sort controls
const activityTypeFilter = ref('') // default to placeholder
const activitySortDirection = ref('desc') // 'desc' = newest first, 'asc' = oldest first

const activityTypeOptions = [
  { label: 'All', value: 'All' },
  { label: 'Added', value: 'addFood' },
  { label: 'Consumed', value: 'conFood' },
  { label: 'Expired', value: 'expFood' },
  { label: 'Donated', value: 'donFood' },
  { label: 'Pending Donation', value: 'pendingDonFood' },
]

// Time frame filter
const activityTimeFrame = ref('') // default to placeholder
const activityTimeFrameOptions = [
  { label: 'All', value: 'all' },
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
]

const filteredSortedActivities = computed(() => {
  let acts = [...activities.value]
  // Filter by type
  if (activityTypeFilter.value && activityTypeFilter.value !== 'All') {
    acts = acts.filter((a) => a.activityType === activityTypeFilter.value)
  }
  // Filter by time frame
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
  // Sort by createdAt
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

const auth = getAuth()
const user = ref(auth.currentUser)
const userId = computed(() => user.value?.uid || null)

auth.onAuthStateChanged((u) => {
  user.value = u
})

watch(userId, async (val) => {
  if (val) {
    // Load all user collections live after userId is available
    const foodItemsRef = collection(db, 'user', val, 'foodItems')
    const foodItemsSnapshot = await getDocs(foodItemsRef)
    foodItems.value = foodItemsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    const recipesRef = collection(db, 'user', val, 'recipes')
    const recipesSnapshot = await getDocs(recipesRef)
    recipes.value = recipesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    const activityRef = collection(db, 'user', val, 'activities')
    const activitySnapshot = await getDocs(activityRef)
    activities.value = activitySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  } else {
    // Clear data if user logs out
    foodItems.value = []
    recipes.value = []
    activities.value = []
  }
})

// Fetch food items function
async function loadFoodItems() {
  if (userId.value) {
    const foodItemsRef = collection(db, 'user', userId.value, 'foodItems')
    const foodItemsSnapshot = await getDocs(foodItemsRef)
    foodItems.value = foodItemsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  }
}

// Fetch activities function
async function loadActivities() {
  if (userId.value) {
    const activityRef = collection(db, 'user', userId.value, 'activities')
    const activitySnapshot = await getDocs(activityRef)
    activities.value = activitySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    activitiesLoaded.value = true
  }
}

// Call loadFoodItems and loadActivities on load
onMounted(() => {
  loadFoodItems()
  loadActivities()
})

// Also, watch for userId changes (like login)
watch(userId, () => {
  loadFoodItems()
  loadActivities()
})

// Categories for select input
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
  'Condiments & Sauces': [
    'milliliter(s)',
    'liter(s)',
    'jar(s)',
    'bottle(s)',
    'gram(s)',
    'ounce(s)',
  ],
  'Canned & Jarred Goods': ['can(s)', 'jar(s)', 'gram(s)', 'ounce(s)', 'pack(s)'],
  'Frozen Foods': ['kg(s)', 'gram(s)', 'pack(s)', 'bag(s)', 'box(es)', 'lb(s)'],
  'Grains & Pasta': ['kg(s)', 'gram(s)', 'lb(s)', 'bag(s)', 'box(es)', 'pack(s)'],
  'Herbs & Spices': ['gram(s)', 'ounce(s)', 'jar(s)', 'bottle(s)', 'bunch(es)', 'piece(s)'],
  'Breakfast & Cereal': ['box(es)', 'bag(s)', 'pack(s)', 'kg(s)', 'gram(s)', 'bottle(s)'],
  Other: ['piece(s)', 'unit(s)', 'pack(s)', 'box(es)', 'kg(s)', 'gram(s)'],
}

// Filtered food items (remove duplicates, search, filter, sort)
const filteredFoodItems = computed(() => {
  const uniqueItems = foodItems.value.filter(
    (item, index, self) => index === self.findIndex((i) => i.id === item.id),
  )

  let items = [...uniqueItems]

  // Exclude items with empty or whitespace-only names
  items = items.filter((item) => item.name && item.name.trim().length > 0)

  // Search
  if (searchText.value && searchText.value.trim()) {
    const searchTerm = searchText.value.toLowerCase().trim()
    items = items.filter((item) => item.name.toLowerCase().includes(searchTerm))
  }

  // Category filter
  if (selectedCategory.value && selectedCategory.value !== 'All Categories') {
    items = items.filter((item) => item.category === selectedCategory.value)
  }

  // ... rest of your sorting logic
  // Apply sorting
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
  let date
  if (dateObj) {
    if (typeof dateObj.toDate === 'function') {
      date = dateObj.toDate() // Firestore Timestamp
    } else if (dateObj instanceof Date) {
      date = dateObj // JS Date
    } else {
      date = new Date(dateObj) // try parsing string or other formats
    }
  } else {
    return '' // or some default string for missing date
  }

  if (isNaN(date)) {
    return '' // Handle invalid date
  }

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
      // Firestore Timestamp
      expDate = food.expirationDate.toDate()
    } else if (food.expirationDate instanceof Date) {
      // Plain JS Date
      expDate = food.expirationDate
    } else {
      // Try to parse a string
      expDate = new Date(food.expirationDate)
    }
  } else {
    // No expiration date, assume far future or zero days left
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
    return 'normal-card' // fallback class if no expirationDate
  }

  if (isNaN(expDate)) return 'normal-card' // protect against invalid date

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

watchEffect(async () => {
  if (!activitiesLoaded.value) return
  const expiredFoods = foodItems.value.filter((food) => getDaysLeft(food) < 0)
  const uid = userId.value

  for (const food of expiredFoods) {
    // Prevent duplicate logs by checking both local and Firestore activities
    const alreadyLogged = activities.value.some(
      (a) => a.foodName === food.name && a.activityType === 'expFood',
    )
    if (!alreadyLogged && uid) {
      // Check Firestore for existing expFood activity for this food
      const actRef = collection(db, 'user', uid, 'activities')
      const q = query(
        actRef,
        where('foodName', '==', food.name),
        where('activityType', '==', 'expFood'),
      )
      const snapshot = await getDocs(q)
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
          note: 'expired',
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

// Calculate consecutive activity days streak
const calculateActivityStreak = () => {
  if (!activitiesLoaded.value || activities.value.length === 0) return 0

  // Get unique activity dates, sorted from newest to oldest
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

  // Check if there's activity today or yesterday (grace period)
  if (activityDates[0] < todayMidnight - oneDayMs) {
    return 0 // Streak broken if no activity today or yesterday
  }

  // Count consecutive days
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

const analytics = computed(() => {
  // const items = activeFoodItems.value
  const wasteActivities = activities.value.filter((a) => a.activityType === 'expFood')
  // fix: check activityType for consumed food activities
  const usedActivities = activities.value.filter((a) => a.activityType === 'conFood')
  const donatedActivities = activities.value.filter((a) => a.activityType === 'donFood')
  // console.log(wasteActivities)
  // console.log(usedActivities)
  // console.log("mine" + donatedActivities)
  // console.log("end")

  // Total waste calculation
  const totalWasteItems = wasteActivities.length
  const totalWasteMoney = wasteActivities.reduce((total, activity) => {
    // Multiply price by quantity (convert price to number since it's a string)
    return total + Number(activity.price)
  }, 0)

  // Total saved calculation: count only fully consumed food
  // Only activities with note === 'fully consumed' are counted as saved items.
  // Partial consumption events are intentionally excluded from the saved count,
  // as per current business logic. If partial consumption should contribute,
  // update this filter accordingly.
  const totalSavedItems = activities.value.filter(
    (a) => a.activityType === 'conFood' && a.note === 'fully consumed',
  ).length
  const totalSavedMoney = usedActivities.reduce((total, activity) => {
    return total + Number(activity.price)
  }, 0)

  // Reduction percentage - items used before expiry vs total items
  const totalItemsHandled = totalWasteItems + totalSavedItems
  const reductionPercentage =
    totalItemsHandled > 0 ? Math.round((totalSavedItems / totalItemsHandled) * 100) : 0
  //test

  // Current inventory
  const inventoryValue = foodItems.value.reduce((sum, item) => {
    const price = Number(item.price) || 0
    return sum + price
  }, 0)
  const inventoryItems = foodItems.value.length

  // calculate streak
  const streakDays = calculateActivityStreak()

  // TODO Food Donated
  // const foodDonated = donatedActivities.length

  // foodScore algo = itemssaved - itemswasted + moneysaved
  const itemsScore = Math.max(0, totalSavedItems * 0.4 - totalWasteItems * 0.4)
  const moneyScore = Math.max(0, totalSavedMoney * 0.2 - totalWasteMoney * 0.2)
  const baseScore = Math.round(itemsScore + moneyScore)

  // Apply streak multi
  const streakMulti = streakDays > 0 ? 1 + streakDays / 7 : 0
  const foodScore = Math.round(baseScore * Math.max(1, streakMulti))

  return {
    totalWaste: { money: totalWasteMoney, items: totalWasteItems },
    totalSaved: { money: totalSavedMoney, items: totalSavedItems },
    reduction: reductionPercentage,
    inventory: { value: inventoryValue, items: inventoryItems },
    foodScore: foodScore,
    streakDays: streakDays,
  }
})

// Watch foodScore and update Firebase when it changes
watchEffect(async () => {
  const score = analytics.value.foodScore;
  const uid = userId.value;
  
  
  if (uid && activitiesLoaded.value && foodItems.value.length >= 0) {
    try {
      const userDocRef = doc(db, 'user', uid);
      await updateDoc(userDocRef, {
        foodScore: score,
        streak : analytics.value.streakDays
      });
    } catch (err) {
      console.error('Failed to update foodScore:', err);
    }
  }
});

// Chart options
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true },
    title: { display: false },
  },
}

// Waste vs Savings bar chart data
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']


const toMonthIndex = (d) => {
  if (!d) return null
  const date = (d instanceof Date) ? d : new Date(d)
  if (isNaN(date)) return null
  return date.getMonth() // 0..11
}

const wasteVsSavingsData = computed(() => {
  // Initialize 12 months to 0
  const waste = Array(12).fill(0)
  const saved = Array(12).fill(0)
  for (const a of activities.value ?? []) {
    const m = toMonthIndex(a.createdAt)
    console.log(m)
    if (m == null) continue

    if (a.activityType === 'expFood') {
      // count items (use quantity if provided)
      waste[m] += Number(a.quantity) || 1
    } else if (a.activityType === 'conFood' && a.note === 'fully consumed') {
      saved[m] += Number(a.quantity) || 1
    }
  }

  // Optional: show only months up to the latest activity, else full year
  const lastIdx = Math.max(
    waste.findLastIndex(v => v>0),
    saved.findLastIndex(v => v>0)
  )
  const end = lastIdx >= 0 ? lastIdx + 1 : 12
  const labels = MONTHS.slice(0, end)

  return {
    labels,
    datasets: [
      {
        label: 'Savings',
        data: saved.slice(0, end),
        tension: 0.35,
        fill: true,
        backgroundColor: 'rgba(123, 97, 255, 0.25)', // purple fill
        borderColor: '#7B61FF',
        pointRadius: 0,
        borderWidth: 2
      },
      {
        label: 'Waste',
        data: waste.slice(0, end),
        tension: 0.35,
        fill: true,
        backgroundColor: 'rgba(255, 165, 0, 0.25)', // orange fill
        borderColor: '#FFA449',
        pointRadius: 0,
        borderWidth: 2
      }
    ]
  }
})

const wasteVsSavingsOpts = {
  maintainAspectRatio: false,
  responsive: true,
  plugins: {
    legend: { display: false }, // keep it clean; set to true if you want
    tooltip: {
      backgroundColor: '#111827',
      titleColor: '#fff',
      bodyColor: '#e5e7eb',
      displayColors: false,
      padding: 10,
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}`
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#9CA3AF', font: { weight: 600 } }
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(0,0,0,.06)', drawBorder: false },
      ticks: { color: '#A3A3B0', precision: 0 } // integers
    }
  },
  layout: { padding: { top: 6, right: 6, left: 6, bottom: 0 } },
  animation: { duration: 600, easing: 'easeOutCubic' }
}

// Waste by category pie chart (simple breakdown based on activities)

// tiny helper to add alpha to hex
const hexA = (hex, a = 1) => {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16)
  return `rgba(${r},${g},${b},${a})`
}

// Use local activities state for waste-by-category so logged expFood entries are included
const wasteByCategoryChart = computed(() => {
  const wasteActs = (activities.value || []).filter((a) => a.activityType === 'expFood')
   console.log(wasteActs)
  // console.log('wasteActs', wasteActs)
  const counts = {}
  wasteActs.forEach((a) => {
    const cat = a.category || 'Unknown'
    counts[cat] = counts[cat] = (counts[cat] || 0) + 1 
  })
  console.log(counts)
  const labels = Object.keys(counts)
  const data = labels.map((l) => counts[l])
  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: ['#eab308', '#f43f5e', '#10b981', '#3b82f6', '#a78bfa'],
      },
    ],
  }
})

/* ====== DESIGN BITS (center text like the screenshot) ====== */
const centerTextPlugin = {
  id: 'centerText',
  afterDraw(chart) {
    const { ctx, chartArea, data } = chart
    if (!chartArea) return
    const vals = data.datasets[0]?.data ?? []
    const total = vals.reduce((a,b)=>a+b,0)
    if (!total) return
    const max = Math.max(...vals)
    const pct = Math.round((max / total) * 100)
    const x = (chartArea.left + chartArea.right) / 2
    const y = (chartArea.top + chartArea.bottom) / 2

  }
}

/* Rounded ring + gaps + thick cutout */
const wasteRingOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#111827',
      titleColor: '#fff',
      bodyColor: '#e5e7eb',
      displayColors: false,
      padding: 10,
      callbacks: {
        label(ctx) {
          const total = ctx.dataset.data.reduce((a,b)=>a+b,0) || 0
          const val = ctx.parsed
          const pct = total ? ((val/total)*100).toFixed(1) : 0
          return `${ctx.label}: ${val} (${pct}%)`
        }
      }
    }
  },
  animation: { duration: 700, easing: 'easeOutCubic' }
}

/* Style your dataset for the ring look */
const chartDataStyled = computed(() => {
  const base = wasteByCategoryChart.value
  const ds = base.datasets[0]
  return {
    labels: base.labels,
    datasets: [{
      ...ds,
      borderWidth: 0,
      borderRadius: 0,
      cutout: '72%'
    }]
  }
})

/* Build Top-3 legend underneath (by share) */
const legendTop3 = computed(() => {
  const labels = chartDataStyled.value.labels || []
  const data = (chartDataStyled.value.datasets?.[0]?.data || []).slice()
  const colors = (chartDataStyled.value.datasets?.[0]?.backgroundColor || []).slice()
  const total = data.reduce((a,b)=>a+b,0) || 1

  const rows = data.map((v, i) => ({
    label: labels[i],
    pct: Math.round((v/total)*100),
    color: colors[i],
    v
  }))
  return rows.sort((a,b)=>b.v - a.v).slice(0,3)
})


function leaderboardNudge(activities) {
  // Count how many were wasted vs saved
  const wasteCount = activities.filter(a => a.activityType === 'expFood').length
  const saveCount  = activities.filter(a => a.activityType === 'conFood').length

  // Calculate ratio and percentage wasted
  const total = wasteCount + saveCount
  const ratio = `${wasteCount}:${saveCount}`
  const pctWasted = total > 0 ? Math.round((wasteCount / total) * 100) : 0

  // Find top wasted categories
  const wasteByCat = {}
  activities.forEach(a => {
    if (a.activityType === 'expFood') {
      const cat = a.category || 'Unknown'
      wasteByCat[cat] = (wasteByCat[cat] || 0) + 1
    }
  })

  const topCats = Object.entries(wasteByCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([cat]) => cat)

  // Build concise message
  const tail = topCats.length
    ? ` Try cutting down on ${topCats.join(', ')} to climb the leaderboard.`
    : ` Keep reducing waste to boost your Food Score.`

  return `Your current waste-to-save ratio is ${ratio} (${pctWasted}% wasted).${tail}`
}
const leaderboardMessage = computed(() => leaderboardNudge(activities.value))

const potentialLoss = computed(() =>
  foodItems.value
    .filter((item) => {
      const days = getDaysLeft(item)
      return days >= 0 && days <= 7
    })
    .reduce((sum, item) => sum + (item.price || 0), 0),
)

const toInputDateString = (d) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const openUse = (food) => {
  useForm.id = food.id
  useForm.name = food.name
  useForm.quantity = 1 // default quantity to use
  useForm.unit = food.unit || ''
  showUseModal.value = true
}
const closeUse = () => {
  showUseModal.value = false
  useForm.id = null
  useForm.name = ''
  useForm.quantity = 0
  useForm.unit = ''
}
const saveUse = async () => {
  if (!useForm.id || useForm.quantity <= 0) return

  const uid = userId.value
  if (!uid) return

  try {
    // Find the food item locally
    const foodIndex = foodItems.value.findIndex((f) => f.id === useForm.id)
    if (foodIndex === -1) return

    const food = foodItems.value[foodIndex]

    // Ensure we don't use more than available
    const usedQty = Math.min(useForm.quantity, food.quantity)
    const newQty = food.quantity - usedQty

    const refDoc = doc(db, 'user', uid, 'foodItems', useForm.id)
    const actRef = collection(db, 'user', uid, 'activities')

    // Log normal use activity
    const activityPayload = {
      activityType: 'conFood',
      createdAt: new Date().toISOString(),
      foodName: food.name,
      category: food.category || '',
      price: String(food.price || 0),
      quantity: String(usedQty),
      unit: food.unit || '',
    }
    const docRef = await addDoc(actRef, activityPayload)
    activities.value.unshift({
      id: docRef.id,
      ...activityPayload,
    })

    if (newQty <= 0) {
      // Remove from Firestore and local list
      await deleteDoc(refDoc)
      foodItems.value.splice(foodIndex, 1)

      // Log fully consumed activity
      const fullConsumedPayload = {
        activityType: 'conFood',
        createdAt: new Date().toISOString(),
        foodName: food.name,
        category: food.category || '',
        price: String(food.price || 0),
        quantity: '0',
        unit: food.unit || '',
        note: 'fully consumed',
      }
      const docRef = await addDoc(actRef, fullConsumedPayload)
      activities.value.unshift({
        id: docRef.id,
        ...fullConsumedPayload,
      })

      showToastFor(`${food.name} fully consumed and removed`)
    } else {
      // Update Firestore food quantity
      await updateDoc(refDoc, {
        quantity: newQty,
      })
      // Update local foodItems
      foodItems.value[foodIndex].quantity = newQty
      showToastFor(`Used ${usedQty} ${food.unit} of ${food.name}`)
    }
    closeUse()
  } catch (err) {
    console.error('Failed to log used food:', err)
    showToastFor('Failed to update food usage.')
  }
}

// Add computed property to get units based on selected category
const availableUnits = computed(() => {
  const category = editForm.category || addForm.category || 'All Categories'
  return categoryUnits[category] || categoryUnits['All Categories']
})

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

  const colRef = collection(db, 'user', userId.value, 'foodItems')
  const actRef = collection(db, 'user', userId.value, 'activities')

  const foodPayload = {
    name: addForm.name || '',
    category: addForm.category || '',
    price: Number(addForm.price) || 0,
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
    // Add food item to Firestore
    const newDocRef = await addDoc(colRef, foodPayload)

    const activityPayload = {
      activityType: 'addFood',
      createdAt: new Date().toISOString(),
      foodName: addForm.name || '',
      category: addForm.category || '',
      price: String(addForm.price || ''),
      quantity: String(addForm.quantity || ''),
      unit: String(addForm.unit || ''),
    }

    const activityDocRef = await addDoc(actRef, activityPayload)

    // Add new item locally for instant UI feedback
    foodItems.value.unshift({ id: newDocRef.id, ...foodPayload })

    // Refresh activities list to show new log
    activities.value.unshift({
      id: activityDocRef.id,
      ...activityPayload,
    })

    showToastFor('Food item added and activity logged!')
    closeAdd()
  } catch (error) {
    console.error('Error adding food item or activity:', error)
    showToastFor('Failed to add food item.')
  }
}

const openEdit = (food) => {
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
    price: Number(editForm.price) || 0,
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
  closeEdit()
};


const deleteFood = async (food) => {
  if (!food || food.id == null) return
  try {
    const uid = userId.value
    if (!uid) {
      console.warn('Not logged in')
      return false
    }
    // Delete the food item doc
    const refDoc = doc(db, 'user', uid, 'foodItems', food.id)
    await deleteDoc(refDoc)

    // Delete corresponding activities
    const actRef = collection(db, 'user', uid, 'activities')
    // Find all activities for this food item by foodName and activityType (optional: tighten filter)
    const q = query(
      actRef,
      where('foodName', '==', food.name),
      where('activityType', '==', 'addFood'),
    )
    const actSnapshot = await getDocs(q)

    // Delete all matching activity docs
    const deletePromises = []
    actSnapshot.forEach((docSnap) => {
      deletePromises.push(deleteDoc(docSnap.ref))
    })
    await Promise.all(deletePromises)

    // Remove locally
    const idx = foodItems.value.findIndex((f) => f.id === food.id)
    if (idx !== -1) foodItems.value.splice(idx, 1)

    // (Optionally) update your activities UI list as well
    activities.value = activities.value.filter(
      (a) => !(a.foodName === food.name && a.activityType === 'addFood'),
    )

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

// food donation status
const foodDonationStatus = computed(() => {
  const status = {}
  const donationActs = activities.value.filter((a) =>
    ['pendingDonFood', 'donFood'].includes(a.activityType),
  )

  for (const act of donationActs) {
    const name = act.foodName
    if (!status[name] || new Date(act.createdAt) > new Date(status[name].createdAt)) {
      status[name] = {
        type: act.activityType,
        date: act.createdAt,
      }
    }
  }
  return status
})

//monkey gamification
async function checkAndUnlockAccessories(uid, newScore) {
  const accSnap = await getDocs(
    query(collection(db, "accessories"), where("requiredScore", "<=", newScore))
  );

  const unlockedIds = accSnap.docs.map(d => d.id);
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  const current = userSnap.data().monkey.accessories || [];

  const toAdd = unlockedIds.filter(id => !current.includes(id));
  if (toAdd.length) {
    await updateDoc(userRef, {
      "monkey.accessories": arrayUnion(...toAdd)
    });
  }
}

watch(() => analytics.value.foodScore, async (score) => {
  if (currentUser.value) {
    await checkAndUnlockAccessories(currentUser.value.uid, score);
    await loadUserMonkey();   // refresh UI
  }
});



</script>

<template>
  <div class="container-fluid p-4">
    <div class="dashboard-overview">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 class="h2 mb-2">Dashboard</h1>
          <p class="text-muted mb-0">Track your food inventory and reduce waste</p>
        </div>
        <div class="ms-3">
          <div style="transform: rotateY(9.20483deg)">
            <button
              @click="overviewCollapsed = !overviewCollapsed"
              :aria-expanded="!overviewCollapsed"
              class="btn btn-sm btn-outline-secondary header-collapse-btn"
            >
              <i :class="overviewCollapsed ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"></i>
              <span class="visually-hidden">Toggle overview rows</span>
            </button>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-3">
        <div class="col-6 col-lg-3">
          <div
            class="position-relative p-3 rounded-4 text-white shadow d-flex flex-column justify-content-between"
            style="
              background: linear-gradient(
                135deg,
                rgba(0, 102, 60, 0.85) 0%,
                rgba(50, 200, 120, 0.6) 100%
              );
              box-shadow: 0 6px 14px rgba(0, 0, 0, 0.1);
              height: 130px;
            "
          >
            <!-- Left: Icon + label -->
            <div
              class="position-absolute top-50 start-0 translate-middle-y ms-3 d-flex flex-column align-items-center"
              style="width: 90px"
            >
              <div
                class="rounded-circle bg-white bg-opacity-25 d-flex justify-content-center align-items-center mb-1 p-2"
                style="width: 56px; height: 56px"
              >
                <i class="bi bi-graph-up-arrow fs-5 text-white"></i>
              </div>
              <small class="text-white text-center">Food Score</small>
            </div>

            <!-- Right: Score + Streak -->
            <div class="text-end align-self-end pe-2 mt-2 position-relative">
              <h3 class="fw-bold mb-0 text-white">{{ analytics.foodScore }}</h3>
              <small class="text-white">points</small>

              <!-- Streak badge -->
              <div v-if="analytics.streakDays > 0" class="mt-2">
                <span
                  class="streak-fire"
                  :class="{
                    'fire-small': analytics.streakDays < 7,
                    'fire-medium': analytics.streakDays >= 7 && analytics.streakDays < 14,
                    'fire-large': analytics.streakDays >= 14,
                  }"
                  >🔥</span
                >
                <span class="streak-text text-white">
                  {{ analytics.streakDays }} day{{ analytics.streakDays !== 1 ? 's' : '' }} streak
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div
            class="position-relative p-3 rounded-4 text-white shadow d-flex flex-column justify-content-between"
            style="
              background: linear-gradient(
                135deg,
                rgba(0, 74, 173, 0.85) 0%,
                rgba(59, 130, 246, 0.65) 100%
              );
              box-shadow: 0 6px 14px rgba(0, 0, 0, 0.1);
              height: 130px;
            "
          >
            <!-- Left: Icon + label -->
            <div
              class="position-absolute top-50 start-0 translate-middle-y ms-3 d-flex flex-column align-items-center"
              style="width: 90px"
            >
              <div
                class="rounded-circle bg-white bg-opacity-25 d-flex justify-content-center align-items-center mb-1 p-2"
                style="width: 56px; height: 56px"
              >
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
          <div
            class="position-relative p-3 rounded-4 text-white shadow d-flex flex-column justify-content-between"
            style="
              background: linear-gradient(
                135deg,
                rgba(153, 27, 27, 0.9) 0%,
                rgba(239, 68, 68, 0.65) 100%
              );
              box-shadow: 0 6px 14px rgba(0, 0, 0, 0.1);
              height: 130px;
            "
          >
            <!-- Left: Icon + label -->
            <div
              class="position-absolute top-50 start-0 translate-middle-y ms-3 d-flex flex-column align-items-center"
              style="width: 90px"
            >
              <div
                class="rounded-circle bg-white bg-opacity-25 d-flex justify-content-center align-items-center mb-2"
                style="width: 56px; height: 56px"
              >
                <i class="bi bi-currency-dollar fs-5 text-white"></i>
              </div>
              <small class="text-white text-center">Potential Loss</small>
            </div>

            <!-- Right: Count -->
            <div class="text-end align-self-end pe-2 mt-2 position-relative">
              <h3 class="fw-bold mb-0 text-white">${{ potentialLoss.toFixed(2) }}</h3>
              <small class="text-white">if expired</small>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div
            class="position-relative p-3 rounded-4 text-white shadow d-flex flex-column justify-content-between"
            style="
              background: linear-gradient(
                135deg,
                rgba(202, 84, 0, 0.9) 0%,
                rgba(249, 115, 22, 0.65) 100%
              );
              box-shadow: 0 6px 14px rgba(0, 0, 0, 0.1);
              height: 130px;
            "
          >
            <!-- Left: Icon + label -->
            <div
              class="position-absolute top-50 start-0 translate-middle-y ms-3 d-flex flex-column align-items-center"
              style="width: 90px"
            >
              <div
                class="rounded-circle bg-white bg-opacity-25 d-flex justify-content-center align-items-center mb-1 p-2"
                style="width: 56px; height: 56px"
              >
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
  <div class="card border-0 shadow-sm h-100">
    <div class="card-body">
      <div class="d-flex align-items-center mb-2">
        <div class="bg-warning bg-opacity-25 rounded-circle p-2 me-2">
          <i class="bi bi-trophy text-warning fs-5"></i>
        </div>
        <h6 class="card-title fw-semibold mb-0">Leaderboard Insights</h6>
      </div>
      <p class="card-text text-secondary small mb-0">
        {{ leaderboardMessage }}
      </p>
    </div>
  </div>
</div>

              <!-- Right panel -->
              <div class="col-md-8 p-3 p-md-4">
                <div class="d-flex align-items-center justify-content-between mb-3">
                  <h5 class="mb-0">
                    <i class="bi bi-activity me-2"></i>
                    Waste vs Savings
                  </h5>
                  <div class="d-flex align-items-center small fw-semibold">
                    <span class="me-3 d-inline-flex align-items-center">
                      <span class="me-2" style="width:10px; height:10px; border-radius:50%; background: #7B61FF;"></span>
                      Savings
                    </span>
                    <span class="d-inline-flex align-items-center">
                      <span class="me-2" style="width:10px; height:10px; border-radius:50%; background: #FFA449;"></span>
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
                  <div class="rounded-3 d-flex justify-content-center align-items-center flex-shrink-0 me-3" style="width: 48px; height: 48px; background-color: rgba(239, 68, 68, 0.1); color: #ef4444;">
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
                  <div class="rounded-3 d-flex justify-content-center align-items-center flex-shrink-0 me-3" style="width: 48px; height: 48px; background-color: rgba(16, 185, 129, 0.1); color: #10b981;">
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
                  <div class="rounded-3 d-flex justify-content-center align-items-center flex-shrink-0 me-3" style="width: 48px; height: 48px; background-color: rgba(37, 99, 235, 0.1); color: #2563eb;">
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
                  <div class="rounded-3 d-flex justify-content-center align-items-center flex-shrink-0 me-3" style="width: 48px; height: 48px; background-color: rgba(249, 115, 22, 0.1); color: #f97316;">
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
          <div class="glass-card p-4">
            <h5 class="mb-3">
              <i class="bi bi-pie-chart me-2"></i>
              Waste by Category
            </h5>
            <div class="mx-auto" style="width:240px;height:300px;" v-if="chartDataStyled.datasets[0].data.length">
              <Pie :data="chartDataStyled" :options="wasteRingOpts" :plugins="[centerTextPlugin]" />
            </div>
            <p class="text-secondary small text-center my-4" v-else>No waste data yet</p>

            <div class="row text-center mt-3 g-0" v-if="legendTop3.length">
              <div class="col" v-for="(item, i) in legendTop3" :key="i">
                <div class="fw-bold fs-3">
                  {{ item.pct }}<span class="fs-6">%</span>
                </div>
                <div class="d-inline-flex align-items-center gap-1 text-secondary small">
                  <span class="rounded-circle" :style="{width:'8px',height:'8px',backgroundColor:item.color}"></span>
                  {{ item.label }}
                </div>
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
              <input
                v-model="searchText"
                type="text"
                class="form-control"
                placeholder="Search food items..."
              />
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
              <button
                @click="toggleSortDirection"
                class="btn btn-outline-secondary sort-direction-btn w-100"
                :title="getSortButtonTitle"
              >
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
              <div
                v-for="food in filteredFoodItems"
                :key="food.id"
                :class="[
                  'food-card',
                  getFoodCardClass(food),
                  'd-flex',
                  'flex-column',
                  'justify-content-between',
                ]"
              >
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
                  <button
                    class="food-btn food-btn-recipe px-2 py-1"
                    style="font-size: 0.92em; min-width: 0"
                    @click.prevent="goToRecipes(food)"
                  >
                    <i class="bi bi-book"></i> Recipes
                  </button>
                  <div class="food-actions d-flex gap-2">
                    <button class="food-btn food-btn-edit" @click.prevent="openEdit(food)"><i class="bi bi-pencil"></i>
                      Edit</button>
                    <button class="food-btn food-btn-use" @click.prevent="openUse(food)"><i class="bi bi-check2"></i>
                      Consume</button>
                    <button class="food-btn food-btn-delete" @click.prevent="openDelete(food)"><i
                        class="bi bi-trash"></i></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Activities -->
      <div class="col-lg-4 d-none d-lg-block d-flex flex-column h-100">
        <div class="glass-card p-4 d-flex flex-column flex-grow-1 h-100" style="min-height: 0">
          <h3 class="h5 mb-2">Recent Activity</h3>
          <div class="d-flex align-items-center justify-content-between mb-3">
            <div class="d-flex gap-2 w-100">
              <select
                v-model="activityTypeFilter"
                class="form-select form-select-sm"
                style="width: auto; min-width: 110px"
              >
                <option disabled value="">Activity</option>
                <option v-for="opt in activityTypeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <select
                v-model="activityTimeFrame"
                class="form-select form-select-sm"
                style="width: auto; min-width: 90px"
              >
                <option disabled value="">Time</option>
                <option v-for="opt in activityTimeFrameOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <button
                class="btn btn-outline-secondary btn-sm"
                :title="activitySortDirection === 'desc' ? 'Newest first' : 'Oldest first'"
                @click="activitySortDirection = activitySortDirection === 'desc' ? 'asc' : 'desc'"
              >
                <i
                  :class="activitySortDirection === 'desc' ? 'bi bi-sort-down' : 'bi bi-sort-up'"
                ></i>
              </button>
            </div>
          </div>
          <div class="flex-grow-1 d-flex flex-column min-h-0">
            <div v-if="filteredSortedActivities.length === 0" class="text-center py-4 flex-grow-1">
              <p class="text-muted">No recent activity</p>
            </div>
            <div v-else class="d-flex flex-column gap-3 activity-scroll flex-grow-1">
              <div
                v-for="activity in filteredSortedActivities"
                :key="activity.id"
                class="pb-3 border-bottom"
              >
                <div v-if="activity.activityType === 'addFood'">
                  <p class="mb-1 small">
                    <strong
                      >{{ activity.quantity }} {{ activity.unit }} of
                      {{ activity.foodName }} added</strong
                    >
                  </p>
                </div>
                <div v-else-if="activity.activityType === 'conFood'">
                  <p class="mb-1 small">
                    <strong v-if="activity.note === 'fully consumed'" class="text-success">
                      All of {{ activity.foodName }} fully consumed
                    </strong>
                    <strong v-else>
                      {{ activity.quantity }} {{ activity.unit }} of {{ activity.foodName }} consumed
                    </strong>
                  </p>
                </div>
                <div v-else-if="activity.activityType === 'expFood'">
                  <p class="mb-1 small">
                    <strong :class="{ 'text-danger': activity.note === 'expired' }">
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

    <!-- Edit Food Modal -->
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
            <option
              v-for="cat in categories.filter((c) => c !== 'All Categories')"
              :key="cat"
              :value="cat"
            >
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
        <div class="row g-2 mt-2">
          <div class="col-6">
            <label class="form-label">Quantity</label>
            <input v-model.number="useForm.quantity" type="number" min="1" class="form-control" style="height: 45px"/>
          </div>
          <div class="col-6">
            <label class="form-label">Unit</label>
            <input v-model="useForm.unit" type="text" class="form-control" disabled style="height: 45px;"/>
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
      <span class="fab-text">Add Food</span>
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
            <option
              v-for="cat in categories.filter((c) => c !== 'All Categories')"
              :key="cat"
              :value="cat"
            >
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
        Are you sure you want to delete <strong>{{ deleteTarget?.name }}</strong
        >? This action cannot be undone.
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
/* --- Stat Card Alignment Fix --- */
.stat-card {
  display: flex;
  align-items: center; /* vertically align icon + text */
  justify-content: space-between;
  min-height: 150px;
  padding: 20px 24px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(4, 99, 7, 0.8), rgba(56, 176, 0, 0.5));
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.1);
  color: white;
}

/* Icon + Label container (fixed width) */
.left-section {
  flex: 0 0 90px; /* fixed width for all cards */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* Icon Circle */
.icon-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 24px;
  background: rgba(255, 255, 255, 0.18);
}

/* Label under icon */
.left-section small {
  margin-top: 6px;
  margin-left: 0px;
  font-size: 13px;
  color: #6b7684;
  text-align: center;
  width: 86px; /* consistent width */
}

/* Text section (dynamic width) */
.content {
  flex: 1;
  text-align: right;
}

.content h3 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 2px;
  color: #0f1b2d;
}

.content small {
  font-size: 13px;
  color: #6b7684;
}

/* Optional: Streak badge alignment */
.streak-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #fff9ea;
  border: 1px solid #f6e3b5;
  font-size: 12px;
  color: #7a6a3a;
}

/* --- Responsive tweak for mobile --- */
@media (max-width: 575px) {
  .stat-card {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }

  .left-section {
    flex: unset;
    flex-direction: row;
    justify-content: flex-start;
    gap: 12px;
    width: 100%;
  }

  .content {
    text-align: left;
    width: 100%;
  }
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
  min-width: 56px;
  height: 56px;
  border-radius: 28px;
  background: linear-gradient(180deg, #10b981, #059669);
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  font-size: 20px;
  box-shadow: 0 6px 18px rgba(5, 150, 105, 0.25);
  cursor: pointer;
  z-index: 2500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  white-space: nowrap;
}

.fab-add i {
  flex-shrink: 0;
  transition: transform 0.3s ease;
}

.fab-text {
  font-size: 16px;
  font-weight: 600;
  max-width: 0;
  opacity: 0;
  overflow: hidden;
  transition:
    max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.3s ease;
}

.fab-add:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(5, 150, 105, 0.35);
  padding-right: 20px;
}

.fab-add:hover .fab-text {
  max-width: 100px;
  opacity: 1;
}

.fab-add:hover i {
  transform: rotate(90deg);
}

.fab-add:active {
  transform: translateY(0);
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
}

.modal-card h5 {
  margin-bottom: 8px;
}

.modal-card p {
  margin-bottom: 12px;
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
    0 8px 30px rgba(229, 57, 53, 0.08),
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
  background: linear-gradient(
    135deg,
    rgba(251, 191, 36, 0.3) 0%,
    rgba(245, 158, 11, 0.2) 50%,
    rgba(239, 68, 68, 0.1) 100%
  );
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
  background: linear-gradient(
    135deg,
    rgba(239, 68, 68, 0.3) 0%,
    rgba(251, 146, 60, 0.2) 50%,
    rgba(251, 191, 36, 0.1) 100%
  );
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

/* Streak badge styling */
.streak-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.1));
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
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

/* Make stat-card position relative for absolute positioning */
.stat-card {
  position: relative;
}

.stat-card > * {
  position: relative;
  z-index: 1;
}
</style>
