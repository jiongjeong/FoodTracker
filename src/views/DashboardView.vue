<script setup>
import { useRouter } from 'vue-router';
import { db } from '../firebase.js';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, Timestamp, query, where, getDoc } from 'firebase/firestore';
import { ref, computed, reactive, watch, watchEffect } from 'vue';
import { getAuth } from 'firebase/auth';
import { useAlert } from '@/composables/useAlert.js';
import DashboardHeader from '@/components/dashboard/header.vue'
import WasteVsSavingsChart from '@/components/dashboard/WasteVsSavingsChart.vue'
import WasteByCategoryChart from '@/components/dashboard/WasteByCategoryChart.vue'
import FoodCard from '@/components/dashboard/FoodCard.vue'
import ActivityItem from '@/components/dashboard/ActivityItem.vue'
import FoodFormModal from '@/components/dashboard/FoodFormModal.vue'

const { success, error } = useAlert();

const router = useRouter()
const auth = getAuth()
const user = ref(auth.currentUser)
const userId = computed(() => user.value?.uid || null)
const username = ref('User')

// State variables
const userFoodScore = ref(0);
const userStreak = ref(0);
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
  'Seafood': ['kg(s)', 'gram(s)', 'lb(s)', 'ounce(s)', 'piece(s)', 'pack(s)'],
  'Snacks': ['piece(s)', 'gram(s)', 'pack(s)', 'bag(s)', 'box(es)', 'lb(s)'],
  'Beverages': ['liter(s)', 'milliliter(s)', 'bottle(s)', 'can(s)', 'pack(s)', 'gallon(s)'],
  'Condiments & Sauces': ['milliliter(s)', 'liter(s)', 'jar(s)', 'bottle(s)', 'gram(s)', 'ounce(s)'],
  'Canned & Jarred Goods': ['can(s)', 'jar(s)', 'gram(s)', 'ounce(s)', 'pack(s)'],
  'Frozen Foods': ['kg(s)', 'gram(s)', 'pack(s)', 'bag(s)', 'box(es)', 'lb(s)'],
  'Grains & Pasta': ['kg(s)', 'gram(s)', 'lb(s)', 'bag(s)', 'box(es)', 'pack(s)'],
  'Herbs & Spices': ['gram(s)', 'ounce(s)', 'jar(s)', 'bottle(s)', 'bunch(es)', 'piece(s)'],
  'Breakfast & Cereal': ['box(es)', 'bag(s)', 'pack(s)', 'kg(s)', 'gram(s)', 'bottle(s)'],
  'Other': ['piece(s)', 'unit(s)', 'pack(s)', 'box(es)', 'kg(s)', 'gram(s)'],
}

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
// percentageUsed: the percentage (0-100) of the food item being used
const calculateScoreChange = (activityType, price, percentageUsed = 100) => {
  price = Number(price) || 0;
  percentageUsed = Number(percentageUsed) || 0;

  // Normalize percentage to 0-1 range
  const normalizedPercentage = percentageUsed / 100;

  switch (activityType) {
    case 'conFood': // Consumed/Saved
      return (40 * normalizedPercentage) + (0.2 * price); // +40 points per 100%, +0.2*total_value for money
    case 'expFood': // Expired/Wasted
      return -((60 * normalizedPercentage) + (0.2 * price)); // -60 points per 100%, -0.2*total_value for money, wasting food should bear heaviest weightage
    case 'donFood': // Donated
      return (40 * normalizedPercentage) + (0.2 * price) + (50 * normalizedPercentage); // +40 per 100%, +0.2*total_value, +50 per 100% donated. Bears higher weightage to encourage donation
    default:
      return 0;
  }
};

// Helper function to update food score in Firebase
const updateFoodScore = async (activityType, price, uid, percentageUsed = 100) => {
  if (!uid) return { newScore: null, pointsEarned: 0 };

  try {
    const userDocRef = doc(db, 'user', uid);

    // Get current score and streak from Firebase
    const currentDoc = await getDoc(userDocRef);
    const currentScore = currentDoc.exists() ? (currentDoc.data().foodScore || 0) : 0;
    const streakDays = currentDoc.exists() ? (currentDoc.data().streak || 0) : 0;

    const streakMultiplier = streakDays > 0 ? (1 + streakDays / 7) : 1;

    // Calculate base score change
    const baseScoreChange = calculateScoreChange(activityType, price, percentageUsed);

    // Apply streak multiplier and round to whole number
    const adjustedChange = Math.round(baseScoreChange * streakMultiplier);

    const newScore = Math.max(0, currentScore + adjustedChange);

    await updateDoc(userDocRef, {
      foodScore: newScore
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
        const userData = userDoc.data();
        userFoodScore.value = userData.foodScore || 0;
        userStreak.value = userData.streak || 0;
        username.value = userData.username || userData.displayName || user.value?.displayName || 'User';
      }
    } catch (err) {
      console.error('Failed to load food score:', err);
    }
  } else {
    foodItems.value = []
    recipes.value = []
    activities.value = []
    userFoodScore.value = 0
    userStreak.value = 0
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
        // Reset streak to 0 when food expires
        const userDocRef = doc(db, 'user', uid)
        await updateDoc(userDocRef, { streak: 0 })
        userStreak.value = 0

        // Calculate points BEFORE creating activity - use 100% since entire item expired
        const { newScore, pointsEarned } = await updateFoodScore('expFood', food.price, uid, 100);
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

  // Check for activity gap (no activity in last 24 hours)
  if (activities.value.length > 0) {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get most recent activity
    const sortedActivities = [...activities.value].sort((a, b) => {
      const dateA = new Date(a.createdAt)
      const dateB = new Date(b.createdAt)
      return dateB - dateA
    })

    const mostRecentActivity = sortedActivities[0]
    const mostRecentDate = new Date(mostRecentActivity.createdAt)

    // If most recent activity is more than 24 hours ago and streak > 0, reset streak
    if (mostRecentDate < oneDayAgo && userStreak.value > 0) {
      const userDocRef = doc(db, 'user', uid)
      await updateDoc(userDocRef, { streak: 0 })
      userStreak.value = 0
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

// Computed properties
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

  // Calculate inventory value excluding pending donations
  // For each food item, calculate its current value based on remaining quantity
  const inventoryValue = inventoryActivities.reduce((sum, item) => {
    const originalPrice = Number(item.price) || 0
    const currentQty = Number(item.quantity) || 0

    // Find all pending donations for this specific food item
    const itemPendingDonations = pendingDonations.filter(
      (activity) => activity.foodId === item.id
    )

    // Calculate total quantity that's pending donation
    const pendingQty = itemPendingDonations.reduce((total, activity) => {
      return total + (Number(activity.quantity) || 0)
    }, 0)

    // Total quantity (current + pending) to calculate price per unit
    const totalQty = currentQty + pendingQty

    // Calculate the value of only the remaining quantity
    let itemValue = originalPrice
    if (totalQty > 0) {
      const pricePerUnit = originalPrice / totalQty
      itemValue = pricePerUnit * currentQty
    }

    return sum + itemValue
  }, 0)

  const adjustedInventoryValue = Math.max(0, inventoryValue)
  const inventoryItems = inventoryActivities.length

  const foodDonated = donatedActivities.length

  return {
    totalWaste: { money: totalWasteMoney, items: totalWasteItems },
    totalSaved: { money: totalSavedMoney, items: totalSavedItems },
    reduction: reductionPercentage,
    inventory: { value: adjustedInventoryValue, items: inventoryItems },
    streakDays: userStreak.value,
    foodDonated: foodDonated,
    pendingDonations: pendingDonations.length,
  }
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
    const pricePerUnit = Math.round((totalPrice / (food.quantity || 1)) * 100) / 100
    const usedValue = Math.round(pricePerUnit * usedQty * 100) / 100
    const remainingValue = Math.round(pricePerUnit * newQty * 100) / 100

    // Calculate percentage of food used
    const percentageUsed = (usedQty / food.quantity) * 100

    const refDoc = doc(db, 'user', uid, 'foodItems', useForm.id)
    const actRef = collection(db, 'user', uid, 'activities')

    // Calculate points BEFORE creating activity using percentage
    const { newScore, pointsEarned } = await updateFoodScore('conFood', usedValue, uid, percentageUsed);
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

      // No additional points for fully consumed marker (already counted above)
      const fullConsumedPayload = {
        activityType: 'conFood',
        createdAt: new Date().toISOString(),
        foodName: food.name,
        category: food.category || '',
        price: String(pricePerUnit),
        quantity: String(usedQty),
        unit: food.unit || '',
        note: 'fully consumed',
        pointsEarned: 0 // No additional points
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

const saveAdd = async (formData) => {
  if (!userId.value) {
    console.warn('No userId available; cannot add food item')
    return
  }

  // Use formData from modal if provided, otherwise fall back to addForm
  const data = formData || addForm
  const nameValue = data.name || ''

  const colRef = collection(db, 'user', userId.value, 'foodItems')
  const actRef = collection(db, 'user', userId.value, 'activities')

  const foodPayload = {
    name: nameValue,
    category: data.category || '',
    price: Number(data.price) || 0,
    quantity: Number(data.quantity) || 0,
    unit: data.unit || '',
    createdAt: data.createdAt
      ? Timestamp.fromDate(new Date(data.createdAt))
      : Timestamp.fromDate(new Date()),
  }

  if (data.expirationDate) {
    foodPayload.expirationDate = Timestamp.fromDate(new Date(data.expirationDate))
  }

  try {
    const newDocRef = await addDoc(colRef, foodPayload)

    const activityPayload = {
      activityType: 'addFood',
      createdAt: new Date().toISOString(),
      foodName: nameValue,
      category: data.category || '',
      price: String(data.price || ''),
      quantity: String(data.quantity || ''),
      unit: String(data.unit || ''),
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

const saveEdit = async (formData) => {
  // Use formData from modal if provided, otherwise fall back to editForm
  const data = formData || editForm
  if (!data.id) return
  const refDoc = doc(db, 'user', userId.value, 'foodItems', data.id)
  const payload = {
    name: data.name,
    category: data.category,
    price: (Number(data.price) || 0),
    quantity: Number(data.quantity) || 0,
    unit: data.unit || '',
  }
  if (data.expirationDate) {
    payload.expirationDate = Timestamp.fromDate(new Date(data.expirationDate))
  }
  if (data.createdAt) {
    payload.createdAt = Timestamp.fromDate(new Date(data.createdAt))
  }
  await updateDoc(refDoc, payload)
  const idx = foodItems.value.findIndex((f) => f.id === data.id)
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
  <div class="container-fluid p-0" style="background:#faf8f5;;">
    <!-- Dashboard Header with Stats Cards -->
    <DashboardHeader
      :userFoodScore="userFoodScore"
      :expiringSoon="expiringSoon"
      :potentialLoss="potentialLoss"
      :expired="expired"
      :analytics="analytics"
      :overviewCollapsed="overviewCollapsed"
      :username="username"
      @toggle-overview="overviewCollapsed = !overviewCollapsed"
    />

    <!-- Charts Section - Seamless with header -->
    <transition name="charts-slide">
      <div v-show="overviewCollapsed" class="charts-wrapper">
        <div class="container-fluid px-4 py-4">
          <div class="row g-4">
            <div class="col-lg-8">
              <WasteVsSavingsChart
                :activities="activities"
                :analytics="analytics"
              />
            </div>

            <div class="col-lg-4">
              <WasteByCategoryChart
                :activities="activities"
              />
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Food Inventory - with spacing from above -->
    <div class="container-fluid p-4">
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
              <FoodCard
                v-for="food in filteredFoodItems"
                :key="food.id"
                :food="food"
                :activities="activities"
                @go-to-recipes="goToRecipes"
                @edit="openEdit"
                @use="openUse"
                @delete="openDelete"
              />
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
              <ActivityItem
                v-for="activity in filteredSortedActivities"
                :key="activity.id"
                :activity="activity"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Edit Food Modal -->
  <FoodFormModal
    :show="showEditModal"
    mode="edit"
    :formData="editForm"
    :categories="categories"
    :categoryUnits="categoryUnits"
    @close="closeEdit"
    @save="saveEdit"
  />

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
    <button v-if="!showAddModal" class="fab-add d-flex align-items-center justify-content-center" @click="openAdd" title="Add Food">
      <i class="bi bi-plus-lg d-flex align-items-center justify-content-center fs-3"></i>
      <span class="fab-text">Add Food</span>
    </button>

    <!-- Add Modal -->
    <FoodFormModal
      :show="showAddModal"
      mode="add"
      :formData="addForm"
      :categories="categories"
      :categoryUnits="categoryUnits"
      @close="closeAdd"
      @save="saveAdd"
    />
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
/* Charts wrapper - seamless with header */
.charts-wrapper {
  background: #faf8f5;
  margin-top: -2rem; /* Pull up to remove gap */
}

/* Smooth slide animation */
.charts-slide-enter-active {
  transition: all 0.4s ease-out;
}

.charts-slide-leave-active {
  transition: all 0.3s ease-in;
}

.charts-slide-enter-from {
  opacity: 0;
  transform: translateY(-20px);
  max-height: 0;
}

.charts-slide-enter-to {
  opacity: 1;
  transform: translateY(0);
  max-height: 1000px;
}

.charts-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 1000px;
}

.charts-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
  max-height: 0;
}

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
