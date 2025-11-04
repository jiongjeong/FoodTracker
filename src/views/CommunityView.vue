<script setup>
import { ref, onMounted, watch, computed, nextTick } from 'vue'
import { db, auth } from '../firebase.js'
import { collection, query, where, getDocs, addDoc, serverTimestamp, getDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from "firebase/auth"
import CommunityHero from '@/components/community/CommunityHero.vue'
import CommunitySearchBar from '@/components/community/CommunitySearchBar.vue'
import CommunityTabs from '@/components/community/CommunityTabs.vue'
import FoodItemCard from '@/components/community/FoodItemCard.vue'
import EmptyState from '@/components/community/EmptyState.vue'
import ContactModal from '@/components/community/ContactModal.vue'
import ShareFoodModal from '@/components/community/ShareFoodModal.vue'
import { loadGoogleMaps } from '@/composables/loadGoogleMap.js'
import { useAlert } from '@/composables/useAlert'

const { success, error, warning, confirm } = useAlert()

const mySharedItems = ref([])
const sharedItems = ref([])
const showContactModal = ref(false)
const showShareModal = ref(false)
const showEditModal = ref(false)
const selectedContact = ref(null)
const currentUser = ref(null)
const itemsWithDistance = ref([])
const preferredLocation = ref(null)
const geometry = ref(null)
const activeTab= ref('myShared')
const searchQuery= ref('')
const showDonatedItems= ref(false)


// Show my shared items
const displayedMySharedItems = computed(() => {
  const sorted = [...mySharedItems.value].sort((a, b) => {
    if (!a.donated && b.donated) return -1
    if (a.donated && !b.donated) return 1
    return 0
  })

  // Filter based on toggle
  let filtered = showDonatedItems.value ? sorted : sorted.filter(item => !item.donated)
  
  // Apply search filter
  if (searchQuery.value && searchQuery.value.trim()) {
    const search = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(item => 
      item.foodName?.toLowerCase().includes(search) ||
      item.category?.toLowerCase().includes(search) ||
      item.location?.address?.toLowerCase().includes(search)
    )
  }
  
  return filtered
})

// Filtered available items with search
const filteredAvailableItems = computed(() => {
  let filtered = itemsWithDistance.value
  
  // Apply search filter
  if (searchQuery.value && searchQuery.value.trim()) {
    const search = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(item => 
      item.foodName?.toLowerCase().includes(search) ||
      item.category?.toLowerCase().includes(search) ||
      item.location?.address?.toLowerCase().includes(search) ||
      item.sharedBy?.toLowerCase().includes(search)
    )
  }
  
  return filtered
})

const handleContact = (item) => {
  selectedContact.value = item
  showContactModal.value = true
}

// Share Form ref
const shareForm = ref({
  foodName: '',
  category: '',
  quantity: '',
  expirationDate: '',
  pickupTime: '',
  notes: '',
  unit: '',
  location: null,
  foodItemId: ''
})

// Edit form ref
const editForm = ref({
  id: '',
  foodItemId: '',
  foodName: '',
  category: '',
  quantity: '',
  unit: '',
  expirationDate: '',
  pickupTime: '',
  notes: '',
  location: null
})

const handleShareFood = async () => {
  Object.assign(shareForm.value, {
    foodName: '',
    category: '',
    quantity: 0,
    unit: '',
    expirationDate: '',
    pickupTime: '',
    notes: '',
    location: null,
    foodItemId: ''
  })
  showShareModal.value = true
  await nextTick()
  if (foodItems.value.length === 1) {
    const item = foodItems.value[0]
    shareForm.value.foodItemId = item.id
    onSelectFoodItem()
  }
}

// calculate days left until expiration
const getDaysLeft = (food) => {
  const now = new Date()
  let expDate

  if (food) {
    if (typeof food.toDate === 'function') {
      expDate = food.toDate()
    } else if (food instanceof Date) {
      expDate = food
    } else {
      expDate = new Date(food)
    }

    const diffTime = expDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(diffDays, 0)
  } else {
    return 0
  }
}

const foodItems = ref([])

// Load Food Items based on user
async function loadFoodItems() {
  if (!currentUser.value) return;
  const foodItemsRef = collection(db, "user", currentUser.value.uid, "foodItems");
  const snapshot = await getDocs(foodItemsRef);
  const allItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

  foodNameMap.value = {}
  allItems.forEach(item => {
    foodNameMap.value[item.id] = item.name
  })

  // Only show items with quantity > 0 in the dropdown
  foodItems.value = allItems.filter(item => item.quantity > 0);
  console.log('loadFoodItems - filtered items (qty > 0):', foodItems.value)
}

function onSelectFoodItem() {
  console.log('onSelectFoodItem called, foodId:', shareForm.value.foodItemId)
  const selected = foodItems.value.find(fi => fi.id === shareForm.value.foodItemId)
  console.log('Selected food item:', selected)
  if (selected) {
    shareForm.value.category = selected.category || ''
    shareForm.value.foodName = selected.name || ''

    if (selected.expirationDate) {
      if (typeof selected.expirationDate.toDate === 'function') {
        shareForm.value.expirationDate = selected.expirationDate.toDate().toISOString().slice(0, 10)
      } else if (selected.expirationDate instanceof Date) {
        shareForm.value.expirationDate = selected.expirationDate.toISOString().slice(0, 10)
      } else {

        shareForm.value.expirationDate = selected.expirationDate.slice(0, 10)
      }
    } else {
      shareForm.value.expirationDate = ''
    }
    // Don't auto-fill quantity - let user enter the amount they want to share
    shareForm.value.quantity = ''
    shareForm.value.unit = selected.unit || ''

    console.log('Updated shareForm:', shareForm.value)
  }
}

// Load user listings
async function loadMyListings() {
  if (!currentUser.value) return;
  const q = query(
    collection(db, "communityListings"),
    where("ownerId", "==", currentUser.value.uid)
  )

  const snapshot = await getDocs(q)
  mySharedItems.value = snapshot.docs.map((doc) => {
    const data = doc.data()
    const foodName = foodNameMap.value[data.foodId] || 'Unknown Item'
    return {
      id: doc.id,
      foodId: data.foodId,
      foodName,
      ...data,
      daysUntilExpiration: getDaysLeft(data.expirationDate),
      pickupTime: data.pickupTime || 'Not specified',
      notes: data.notes || ''
    }
  })
}

// Load all Listings
async function loadAvailableListings() {
  const sharedItemsRef = collection(db, "communityListings")
  const sharedItemsSnapshot = await getDocs(sharedItemsRef)

  // Get all unique owner IDs
  const ownerIds = [...new Set(sharedItemsSnapshot.docs.map(doc => doc.data().ownerId))]

  // Fetch all owner information
  const ownersMap = {}
  for (const ownerId of ownerIds) {
    try {
      const userDocRef = doc(db, 'user', ownerId)
      const userSnap = await getDoc(userDocRef)

      if (userSnap.exists()) {
        const userData = userSnap.data()
        ownersMap[ownerId] = {
          name: userData.name || 'Anonymous',
          email: userData.email || '',
          phone: userData.contactNo || 'Not provided',
          handle: userData.handle || ''
        }
      } else {
        ownersMap[ownerId] = {
          name: 'Anonymous',
          email: '',
          phone: 'Not provided',
          handle: ''
        }
      }
    } catch (error) {
      console.error(`Error fetching owner ${ownerId}:`, error)
      ownersMap[ownerId] = {
        name: 'Anonymous',
        email: '',
        phone: 'Not provided',
        handle: ''
      }
    }
  }

  const ownerFoodIds = {}
  sharedItemsSnapshot.docs.forEach(docSnap => {
    const d = docSnap.data()
    if (!d) return
    const owner = d.ownerId
    const fid = d.foodId
    if (!owner || !fid) return
    ownerFoodIds[owner] = ownerFoodIds[owner] || new Set()
    ownerFoodIds[owner].add(fid)
  })


  const ownerFoodNameMap = {}
  const fetchPromises = []
  Object.keys(ownerFoodIds).forEach(ownerId => {
    ownerFoodNameMap[ownerId] = {}
    ownerFoodIds[ownerId].forEach(foodId => {
      const p = (async () => {
        try {
          const foodDocRef = doc(db, 'user', ownerId, 'foodItems', foodId)
          const foodSnap = await getDoc(foodDocRef)
          if (foodSnap.exists()) {
            ownerFoodNameMap[ownerId][foodId] = foodSnap.data().name || 'Unknown Item'
          } else {
            ownerFoodNameMap[ownerId][foodId] = 'Unknown Item'
          }
        } catch (e) {
          console.warn(`Failed to fetch food item ${foodId} for owner ${ownerId}:`, e)
          ownerFoodNameMap[ownerId][foodId] = 'Unknown Item'
        }
      })()
      fetchPromises.push(p)
    })
  })

  await Promise.all(fetchPromises)

  sharedItems.value = sharedItemsSnapshot.docs.map(doc => {
    const data = doc.data()
    const owner = ownersMap[data.ownerId] || {
      name: 'Anonymous',
      email: '',
      phone: 'Not provided',
      handle: ''
    }


    let resolvedFoodName = data.foodName || 'Unknown Item'
    if ((!resolvedFoodName || resolvedFoodName === 'Unknown Item') && data.foodId && ownerFoodNameMap[data.ownerId]) {
      resolvedFoodName = ownerFoodNameMap[data.ownerId][data.foodId] || resolvedFoodName
    }

    return {
      id: doc.id,
      foodId: data.foodId,
      foodName: resolvedFoodName,
      ...data,
      sharedBy: owner.name,
      contact: {
        email: owner.email,
        phone: owner.phone,
        handle: owner.handle
      },
      daysUntilExpiration: getDaysLeft(data.expirationDate),
      pickupTime: data.pickupTime || 'Not specified',
      notes: data.notes || ''
    }
  })
    .filter(item => item.ownerId !== currentUser.value?.uid)
    .filter(item => !item.donated)
}


// Share Food
async function submitShare(formData) {
  // Use formData from modal if provided, otherwise fall back to shareForm
  const data = formData || shareForm.value

  if (!currentUser.value) {
    await error('Please log in first')
    return
  }
  if (!data.location?.lat || !data.location?.lng) {
    await warning('Please select a pickup location')
    return
  }


  if (!data.foodItemId) {
    await warning('Please select a valid food item')
    return
  }
  const qtyToShare = Number(data.quantity || 0)
  if (!qtyToShare || qtyToShare <= 0) {
    await warning('Please enter a valid quantity')
    return
  }

  try {

    const remaining = getRemainingQuantity(data.foodItemId)
    if (qtyToShare > remaining) {
      await warning(`You only have ${remaining} ${data.unit} left to share.`)
      return
    }

    // Prevent sharing expired items
    if (data.expirationDate && getDaysLeft(data.expirationDate) === 0) {
      await error('This item is expired and cannot be shared.')
      return
    }

    const expDate = new Date(data.expirationDate)


    const payload = {
      ownerId: currentUser.value.uid,
      foodId: data.foodItemId,
      category: data.category,
      quantity: qtyToShare,
      unit: data.unit,
      expirationDate: expDate,
      pickupTime: data.pickupTime || 'Anytime',
      notes: data.notes || '',
      createdAt: serverTimestamp(),
      location: {
        lat: data.location.lat,
        lng: data.location.lng,
        address: data.location.address || ''
      }
    }

    const docRef = await addDoc(collection(db, "communityListings"), payload)


    const foodItemRef = doc(db, 'user', currentUser.value.uid, 'foodItems', data.foodItemId)
    const currentItem = foodItems.value.find(f => f.id === data.foodItemId)
    const currentQty = Number(currentItem?.quantity || 0)
    const totalPrice = Number(currentItem?.price || 0)

    // Store the original quantity (before donation) for percentage calculation later
    const originalQty = currentQty

    // Calculate price per unit from total price
    const pricePerUnit = currentQty > 0 ? Math.round((totalPrice / currentQty) * 100) / 100 : 0
    const newQty = Math.max(0, currentQty - qtyToShare)
    const remainingPrice = Math.round(pricePerUnit * newQty * 100) / 100
    const sharedPrice = Math.round(pricePerUnit * qtyToShare * 100) / 100

    if (currentQty < qtyToShare) {

      try {
        await deleteDoc(doc(db, 'communityListings', docRef.id))
      } catch (rollbackErr) {
        console.warn('Failed to rollback listing after insufficient qty:', rollbackErr)
      }
      await error('Insufficient quantity')
      return
    }

    // Update both quantity AND price
    await updateDoc(foodItemRef, {
      quantity: newQty,
      price: remainingPrice
    })

    await addDoc(collection(db, 'user', currentUser.value.uid, 'activities'), {
      activityType: 'pendingDonFood',
      createdAt: new Date().toISOString(),
      category: payload.category,
      price: sharedPrice,
      foodName: currentItem?.name || data.foodName || '',
      foodId: payload.foodId,
      quantity: payload.quantity,
      unit: payload.unit,
      originalQuantity: originalQty, // Store original quantity for percentage calculation
    })

    await success("Food shared successfully!")
    showShareModal.value = false
    await loadMyListings()
    await loadFoodItems()
  } catch (err) {
    console.error("Error adding listing:", err)
    await error('Failed to share food: ' + (err.message || err))
  }
}

async function markAsDonated(item) {
  const confirmed = await confirm(
    `Are you sure you want to mark "${item.foodName}" as donated? This action cannot be undone.`,
    'Confirm Donation'
  )

  if (!confirmed) return

  try {
    // Update listing as donated
    await updateDoc(doc(db, 'communityListings', item.id), {
      donated: true,
      donatedAt: serverTimestamp()
    })

    const foodItemRef = doc(db, 'user', currentUser.value.uid, 'foodItems', item.foodId)
    const foodItemSnap = await getDoc(foodItemRef)

    let isFullyDonated = false
    let originalQty = 0
    if (foodItemSnap.exists()) {
      const remainingQty = Number(foodItemSnap.data().quantity || 0)
      isFullyDonated = remainingQty <= 0

      // Calculate original quantity (current + donated)
      originalQty = remainingQty + Number(item.quantity)
    } else {
      // If food item doesn't exist, the donated quantity was the original
      originalQty = Number(item.quantity)
      isFullyDonated = true
    }

    try {
      const pendingActivitiesQuery = query(
        collection(db, 'user', currentUser.value.uid, 'activities'),
        where('activityType', '==', 'pendingDonFood'),
        where('foodId', '==', item.foodId)
      )

      const pendingActivitiesSnap = await getDocs(pendingActivitiesQuery)

      if (!pendingActivitiesSnap.empty) {
        const deletePromises = pendingActivitiesSnap.docs.map(doc => deleteDoc(doc.ref))
        await Promise.all(deletePromises)
      }
    } catch (activityError) {
      console.warn('Failed to delete pending activities:', activityError)
    }

    const donationQty = Number(item.quantity) || 1
    const donationTotalPrice = Number(item.price) || 0  // This is total price from listing

    // Calculate percentage of food donated
    const percentageDonated = originalQty > 0 ? (donationQty / originalQty) * 100 : 100

    // Get current score and streak from Firebase
    const userDocRef = doc(db, 'user', currentUser.value.uid)
    const userSnap = await getDoc(userDocRef)
    const currentScore = userSnap.exists() ? (userSnap.data().foodScore || 0) : 0
    const streakDays = userSnap.exists() ? (userSnap.data().streak || 0) : 0

    const streakMultiplier = streakDays > 0 ? (1 + streakDays / 7) : 1

    // Calculate score using percentage: +40 points per 100%, +0.2*price, +50 bonus per 100%
    const normalizedPercentage = percentageDonated / 100
    const baseScoreChange = (40 * normalizedPercentage) + (0.2 * donationTotalPrice) + (50 * normalizedPercentage)
    const adjustedChange = Math.round(baseScoreChange * streakMultiplier)

    const newScore = Math.max(0, currentScore + adjustedChange)

    await updateDoc(userDocRef, {
      foodScore: newScore
    })

    // Log donation activity with points earned
    const activityPayload = {
      activityType: 'donFood',
      category: item.category,
      createdAt: new Date().toISOString(),
      foodName: item.foodName,
      price: donationTotalPrice,  // Store total price
      quantity: donationQty,
      unit: item.unit,
      pointsEarned: adjustedChange
    }

    // If fully donated, add note to mark it
    if (isFullyDonated) {
      activityPayload.note = 'fully donated'

      // Delete the food item from inventory
      await deleteDoc(foodItemRef)
    }

    await addDoc(collection(db, 'user', currentUser.value.uid, 'activities'), activityPayload)

    const successMsg = isFullyDonated
      ? `${item.foodName} fully donated and removed from inventory!`
      : 'Food marked as donated successfully!'

    await success(successMsg)
    await loadMyListings()
    await loadFoodItems()
  } catch (err) {
    console.error(err)
    await error('Failed to mark as donated')
  }
}

// checking if items have alr been shared
const donationActivities = ref([])
const activitiesLoaded = ref(false)
async function loadDonationActivities() {
  if (!currentUser.value) return
  const q = query(
    collection(db, 'user', currentUser.value.uid, 'activities'),
    where('activityType', 'in', ['pendingDonFood', 'donFood'])
  )
  const snap = await getDocs(q)
  donationActivities.value = snap.docs.map(d => d.data())
  activitiesLoaded.value = true
}

const getRemainingQuantity = (foodNameOrId) => {
  let item = foodItems.value.find(f => f.id === foodNameOrId)
  if (!item) {
    item = foodItems.value.find(f => f.name === foodNameOrId)
  }
  if (!item) return 0

  const total = Number(item.quantity) || 0
  const shared = donationActivities.value
    .filter(a => a.foodId === item.id && a.activityType === 'pendingDonFood')
    .reduce((sum, a) => sum + Number(a.quantity || 0), 0)

  const remaining = Math.max(0, total - shared)
  return remaining
}

// Computed property for max shareable quantity
const maxShareQuantity = computed(() => {
  if (!shareForm.value.foodItemId) return 0
  return getRemainingQuantity(shareForm.value.foodItemId)
})

// Check if share quantity is valid
const isShareQuantityValid = computed(() => {
  const qty = Number(shareForm.value.quantity) || 0
  const max = maxShareQuantity.value
  return qty > 0 && qty <= max
})

// Computed property for max editable quantity (for edit mode)
const maxEditQuantity = computed(() => {
  if (!editForm.value.foodItemId) return 0

  // Get the current food item quantity from inventory
  const foodItem = foodItems.value.find(f => f.id === editForm.value.foodItemId)
  if (!foodItem) return 0

  const currentFoodQty = Number(foodItem.quantity || 0)

  // Get the original listing quantity (what was already shared)
  // We need to find this from mySharedItems
  const originalListing = mySharedItems.value.find(item => item.id === editForm.value.id)
  const originalSharedQty = originalListing ? Number(originalListing.quantity || 0) : 0

  // Max = current inventory + what was already shared
  return currentFoodQty + originalSharedQty
})

// Check if edit quantity is valid
const isEditQuantityValid = computed(() => {
  const qty = Number(editForm.value.quantity) || 0
  const max = maxEditQuantity.value
  return qty > 0 && qty <= max
})

// Computed food items with status for modal
const foodItemsWithStatus = computed(() => {
  return foodItems.value
    .map(item => ({
      ...item,
      remainingQty: getRemainingQuantity(item.id),
      isExpired: isExpiredItem(item)
    }))
    .filter(item => item.remainingQty > 0 && !item.isExpired) // Exclude items with no remaining quantity or expired items
})

const isExpiredItem = (item) => {
  if (!item || !item.expirationDate) return false

  return getDaysLeft(item.expirationDate) === 0
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser.value = user
    await loadFoodItems()
    await buildFoodNameMap()
    await loadMyListings()
    await loadAvailableListings()
    await loadDonationActivities()


    if (geometry.value) {
      calculateDistances()
    }
  } else {
    currentUser.value = null
  }
})


onMounted(async () => {
  const google = await loadGoogleMaps()
  geometry.value = google.maps.geometry
  loadPreferredLocation()

  if (sharedItems.value.length > 0) {
    calculateDistances()
  }
})

function setPreferredLocation(place) {
  preferredLocation.value = {
    lat: Number(place.lat),
    lng: Number(place.lng),
    address: place.address || ''
  }
  savePreferredLocation()
}
function clearPreferredLocation() {
  preferredLocation.value = null
  savePreferredLocation()
}

function loadPreferredLocation() {
  if (!currentUser.value) return

  const PREFERRED_LOC_KEY = `foodshare_preferred_location_${currentUser.value.uid}`
  const raw = localStorage.getItem(PREFERRED_LOC_KEY)
  console.log('Raw from localStorage:', raw)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      preferredLocation.value = {
        lat: Number(parsed.lat),
        lng: Number(parsed.lng),
        address: parsed.address || ''
      }
      console.log('Loaded preferred location:', preferredLocation.value)
    } catch (e) {
      console.warn('Invalid stored location', e)
    }
  }
}

function savePreferredLocation() {
  if (!currentUser.value) return

  const PREFERRED_LOC_KEY = `foodshare_preferred_location_${currentUser.value.uid}`
  if (preferredLocation.value) {
    localStorage.setItem(PREFERRED_LOC_KEY, JSON.stringify(preferredLocation.value))
  } else {
    localStorage.removeItem(PREFERRED_LOC_KEY)
  }
}

function calculateDistances() {
  console.log('calculateDistances() called', {
    hasPreferred: !!preferredLocation.value,
    hasGeometry: !!geometry.value,
    itemCount: sharedItems.value.length
  })

  // If no items, clear the list
  if (sharedItems.value.length === 0) {
    itemsWithDistance.value = []
    return
  }

  // If no preferred location, show all items without distance
  if (!preferredLocation.value) {
    itemsWithDistance.value = sharedItems.value.map(i => ({ ...i, distance: null }))
    return
  }

  // If no geometry loaded yet, show items without distance
  if (!geometry.value) {
    itemsWithDistance.value = sharedItems.value.map(i => ({ ...i, distance: null }))
    return
  }

  const userLat = Number(preferredLocation.value.lat)
  const userLng = Number(preferredLocation.value.lng)

  itemsWithDistance.value = sharedItems.value.map(item => {
    if (!item.location?.lat || !item.location?.lng) return { ...item, distance: null }

    const itemLat = Number(item.location.lat)
    const itemLng = Number(item.location.lng)

    try {
      const p1 = new window.google.maps.LatLng(userLat, userLng)
      const p2 = new window.google.maps.LatLng(itemLat, itemLng)
      const meters = geometry.value.spherical.computeDistanceBetween(p1, p2)
      const km = (meters / 1000).toFixed(1)
      return { ...item, distance: `${km}km` + " Away" }
    } catch (e) {
      console.warn('Distance calc failed:', e)
      return { ...item, distance: null }
    }
  })
}

// getting food name from id
const foodNameMap = ref({})
async function buildFoodNameMap() {
  if (!currentUser.value) return

  foodNameMap.value = {}

  const foodItemsRef = collection(db, "user", currentUser.value.uid, "foodItems");
  const snapshot = await getDocs(foodItemsRef);

  snapshot.docs.forEach(doc => {
    const data = doc.data()
    foodNameMap.value[doc.id] = data.name
  })
}

watch(foodItems, async () => {
  await buildFoodNameMap()
}, { immediate: true })


watch(
  [sharedItems, preferredLocation, geometry],
  () => {
    if (sharedItems.value.length && geometry.value) {
      console.log('Watcher triggered → calculating distances')
      calculateDistances()
    }
  },
  { deep: true }
)
watch(preferredLocation, (newVal) => {
  console.log('preferredLocation changed:', newVal)
})


// Edit donated item function
async function editDonated(item) {

  editForm.value = {
    id: item.id,
    foodItemId: item.foodId,
    foodName: item.foodName,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    expirationDate: item.expirationDate instanceof Date
      ? item.expirationDate.toISOString().slice(0, 10)
      : typeof item.expirationDate?.toDate === 'function'
        ? item.expirationDate.toDate().toISOString().slice(0, 10)
        : item.expirationDate?.slice(0, 10) || '',
    pickupTime: item.pickupTime || '',
    notes: item.notes || '',
    location: item.location || null
  }

  showEditModal.value = true
}

// Submit edit function - with proper error handling and rollback
async function submitEdit() {
  if (!currentUser.value) {
    await error('Please log in first')
    return
  }
  if (!editForm.value.location?.lat || !editForm.value.location?.lng) {
    await warning('Please select a pickup location')
    return
  }

  try {
    const expDate = new Date(editForm.value.expirationDate)

    // Get the original listing to compare quantities
    const listingRef = doc(db, 'communityListings', editForm.value.id)
    const listingSnap = await getDoc(listingRef)

    if (!listingSnap.exists()) {
      await error("Listing not found")
      return
    }

    const originalListing = listingSnap.data()
    const originalQty = Number(originalListing.quantity || 0)
    const newQty = Number(editForm.value.quantity)
    const qtyDifference = newQty - originalQty


    if (qtyDifference > 0) {
      const foodItemRef = doc(db, 'user', currentUser.value.uid, 'foodItems', editForm.value.foodItemId)
      const foodItemSnap = await getDoc(foodItemRef)

      if (foodItemSnap.exists()) {
        const currentFoodQty = Number(foodItemSnap.data().quantity || 0)

        if (currentFoodQty < qtyDifference) {
          await warning(`Insufficient quantity. You only have ${currentFoodQty} ${editForm.value.unit} available.`)
          return
        }
      } else {
        await error('Food item not found')
        return
      }
    }

    // Prepare update data
    const updateData = {
      category: editForm.value.category,
      quantity: newQty,
      unit: editForm.value.unit,
      expirationDate: expDate,
      pickupTime: editForm.value.pickupTime || 'Anytime',
      notes: editForm.value.notes || '',
      location: {
        lat: editForm.value.location.lat,
        lng: editForm.value.location.lng,
        address: editForm.value.location.address || ''
      }
    }

    // Update the community listing
    await updateDoc(listingRef, updateData)

    // Update the food item quantity if quantity changed
    if (qtyDifference !== 0) {
      try {
        const foodItemRef = doc(db, 'user', currentUser.value.uid, 'foodItems', editForm.value.foodItemId)
        const foodItemSnap = await getDoc(foodItemRef)

        if (foodItemSnap.exists()) {
          const currentFoodQty = Number(foodItemSnap.data().quantity || 0)
          const currentFoodPrice = Number(foodItemSnap.data().price || 0)

          // Calculate per-unit price from current food item
          const pricePerUnit = currentFoodQty > 0 ? Math.round((currentFoodPrice / currentFoodQty) * 100) / 100 : 0

          // Calculate new quantity and price
          const updatedFoodQty = currentFoodQty - qtyDifference
          const updatedFoodPrice = Math.round(pricePerUnit * updatedFoodQty * 100) / 100

          await updateDoc(foodItemRef, {
            quantity: updatedFoodQty,
            price: updatedFoodPrice
          })
        }
      } catch (foodItemError) {

        await updateDoc(listingRef, {
          quantity: originalQty
        })
        console.warn('Failed to update food item quantity during edit:', foodItemError)
        throw new Error('Failed to update food item quantity. Changes rolled back.')
      }
    }

    // Update the pending donation activity quantity and price
    try {
      const activitiesQuery = query(
        collection(db, 'user', currentUser.value.uid, 'activities'),
        where('activityType', '==', 'pendingDonFood'),
        where('foodId', '==', editForm.value.foodId)
      )

      const activitiesSnap = await getDocs(activitiesQuery)

      if (!activitiesSnap.empty) {
        // Find the activity with matching original quantity
        const matchingActivity = activitiesSnap.docs.find(doc =>
          Number(doc.data().quantity) === originalQty
        )

        const activityDoc = matchingActivity || activitiesSnap.docs[0]
        const oldActivityPrice = Number(activityDoc.data().price) || 0
        const oldActivityQty = Number(activityDoc.data().quantity) || 1

        // Calculate price per unit from the activity (which stores the original proportional price)
        const pricePerUnit = oldActivityQty > 0 ? Math.round((oldActivityPrice / oldActivityQty) * 100) / 100 : 0
        const updatedPrice = Math.round(pricePerUnit * newQty * 100) / 100

        await updateDoc(activityDoc.ref, {
          quantity: newQty,
          unit: editForm.value.unit,
          price: updatedPrice
        })
      }
    } catch (activityError) {
      console.warn('Failed to update activity, but listing and food item were updated:', activityError)

    }

    await success("Listing updated successfully!")
    showEditModal.value = false
    await loadMyListings()
    await loadFoodItems()
    await loadDonationActivities()
  } catch (err) {
    console.error("Error updating listing:", err)
    await error("Failed to update listing: " + err.message)
  }
}

// Cancel donated function
async function canDonated(item) {
  // Check if already donated/claimed
  if (item.donated) {
    await error("This item has already been donated and cannot be cancelled.")
    return
  }

  const confirmed = await confirm(`Are you sure you want to cancel "${item.foodName}"? This will remove it from community listings.`, 'Cancel Donation')

  if (!confirmed) {
    return
  }

  let deletedListing = null
  let originalFoodQty = null

  try {

    if (!item.id) {
      console.error('❌ Item ID is missing')
      await error("Listing ID is missing")
      return
    }

    const listingRef = doc(db, 'communityListings', item.id)
    const listingSnap = await getDoc(listingRef)

    if (!listingSnap.exists()) {
      await error("Listing not found. It may have already been deleted.")
      return
    }

    // Double check if it was marked as donated after the UI was loaded
    const listingData = listingSnap.data()
    if (listingData.donated) {
      await error("This item has already been donated and cannot be cancelled.")
      await loadMyListings() // Refresh the list
      return
    }

    deletedListing = { id: item.id, ...listingData }
    const returnQty = Number(deletedListing.quantity || 0)

    const foodItemRef = doc(db, 'user', currentUser.value.uid, 'foodItems', item.foodId)
    const foodItemSnap = await getDoc(foodItemRef)

    if (!foodItemSnap.exists()) {

      await error('Food item not found. Cannot cancel donation.')
      return
    }

    originalFoodQty = Number(foodItemSnap.data().quantity || 0)
    const currentFoodPrice = Number(foodItemSnap.data().price || 0)
    const newQty = originalFoodQty + returnQty

    // Find the specific pending donation activity for THIS listing
    const activitiesQuery = query(
      collection(db, 'user', currentUser.value.uid, 'activities'),
      where('activityType', '==', 'pendingDonFood'),
      where('foodId', '==', item.foodId)
    )
    const activitiesSnap = await getDocs(activitiesQuery)

    // Find the activity that matches this listing's quantity
    // Only return the price for THIS specific donation being cancelled
    let priceToReturn = 0
    let activityToDelete = null

    if (!activitiesSnap.empty) {
      // Try to find an activity with matching quantity
      const matchingActivity = activitiesSnap.docs.find(doc =>
        Number(doc.data().quantity) === returnQty
      )

      if (matchingActivity) {
        priceToReturn = Number(matchingActivity.data().price) || 0
        activityToDelete = matchingActivity
      } else {
        // If no exact match, calculate proportionally from the first activity
        const firstActivity = activitiesSnap.docs[0]
        const activityQty = Number(firstActivity.data().quantity) || 1
        const activityPrice = Number(firstActivity.data().price) || 0
        const pricePerUnit = activityQty > 0 ? Math.round((activityPrice / activityQty) * 100) / 100 : 0
        priceToReturn = Math.round(pricePerUnit * returnQty * 100) / 100
        activityToDelete = firstActivity
      }
    } else {
      // Fallback: calculate proportionally from current food price
      const pricePerUnit = originalFoodQty > 0 ? Math.round((currentFoodPrice / originalFoodQty) * 100) / 100 : 0
      priceToReturn = Math.round(pricePerUnit * returnQty * 100) / 100
    }

    const newPrice = Math.round((currentFoodPrice + priceToReturn) * 100) / 100

    console.log('💰 Price calculation:', {
      currentFoodPrice,
      priceToReturn,
      newPrice,
      originalQty: originalFoodQty,
      returnQty,
      newQty,
      activityFound: !!activityToDelete
    })

    await deleteDoc(listingRef)

    try {
      await updateDoc(foodItemRef, {
        quantity: newQty,
        price: newPrice
      })
    } catch (foodItemError) {

      await addDoc(collection(db, 'communityListings'), deletedListing)
      console.warn('Failed to return quantity to food item during cancel:', foodItemError)
      throw new Error('Failed to update food item quantity. Listing restored.')
    }

    // Remove only the specific pending donation activity
    try {
      if (activityToDelete) {
        await deleteDoc(activityToDelete.ref)
      }
    } catch (activityError) {
      console.warn('Failed to delete activity, but listing was cancelled:', activityError)

    }

    await success('Donation cancelled successfully!')

    await loadMyListings()
    await loadFoodItems()
    await loadDonationActivities()
  } catch (err) {
    console.error('Error canceling donation:', err)
    await error('Failed to cancel donation: ' + err.message)

    await loadMyListings()
    await loadFoodItems()
    await loadDonationActivities()
  }
}
const getGoogleMapsUrl = (location) => {
  if (!location?.lat || !location?.lng) return null
  return `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`
}
</script>


<template>
  <div style="background: linear-gradient(135deg, #fefefe 0%, #f9f7f4 40%, #f5f2ed 100%);">
    <!-- Hero Section -->
    <CommunityHero
      :my-shared-items-count="mySharedItems.length"
      :available-items-count="itemsWithDistance.length"
      :preferred-location="preferredLocation"
      @location-selected="setPreferredLocation"
      @location-cleared="clearPreferredLocation"
    />

    <!-- Search Bar -->
    <CommunitySearchBar v-model="searchQuery" />

    <!-- Tabs Navigation -->
    <CommunityTabs
      :active-tab="activeTab"
      :my-shared-count="mySharedItems.length"
      :available-count="itemsWithDistance.length"
      @update:active-tab="activeTab = $event"
    />

    <!-- Tab Content -->
    <div class="container-fluid px-3 px-md-4">
      <!-- My Shared Items Tab -->
      <div v-if="activeTab === 'myShared'" class="tab-content-section">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h4 class="fw-bold mb-0">My Shared Items</h4>
          <div class="d-flex gap-2">
            <button v-if="mySharedItems.some(item => item.donated)"
                    class="btn btn-outline-secondary"
                    @click="showDonatedItems = !showDonatedItems">
              <i :class="showDonatedItems ? 'bi bi-eye-slash' : 'bi bi-eye'" class="me-2"></i>
              {{ showDonatedItems ? 'Hide' : 'Show' }} Donated ({{mySharedItems.filter(i => i.donated).length}})
            </button>
            <button class="btn btn-success" @click="handleShareFood">
              <i class="bi bi-plus-circle-fill me-2"></i>
              Share Food
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <EmptyState v-if="mySharedItems.length === 0" type="no-items" @share-food="handleShareFood" />

        <!-- No Active Items -->
        <EmptyState v-else-if="displayedMySharedItems.length === 0" type="no-active" />

        <!-- Items Grid -->
        <div v-else class="row g-3">
          <div v-for="item in displayedMySharedItems" :key="item.id" class="col-12 col-md-6 col-lg-4">
            <FoodItemCard
              :item="item"
              mode="myShared"
              @edit="editDonated"
              @cancel="canDonated"
              @mark-donated="markAsDonated"
            />
          </div>
        </div>
      </div>

      <!-- Available Near You Tab -->
      <div v-if="activeTab === 'available'" class="tab-content-section">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h4 class="fw-bold mb-0">Available Near You</h4>
          <span class="badge bg-primary" style="padding: 8px 16px; font-size: 0.9rem;">
            <i class="bi bi-basket3-fill me-2"></i>
            {{ filteredAvailableItems.length }} Items
          </span>
        </div>

        <!-- Empty State -->
        <EmptyState v-if="filteredAvailableItems.length === 0" type="no-available" />

        <!-- Items Grid -->
        <div v-else class="row g-3">
          <div v-for="item in filteredAvailableItems" :key="item.id" class="col-12 col-md-6 col-lg-4">
            <FoodItemCard
              :item="item"
              mode="available"
              @contact="handleContact"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Contact Modal -->
    <ContactModal
      :show="showContactModal"
      :contact="selectedContact"
      @close="showContactModal = false"
    />

    <!-- Share Food Modal -->
    <ShareFoodModal
      :show="showShareModal"
      :formData="shareForm"
      :foodItems="foodItemsWithStatus"
      :maxShareQuantity="maxShareQuantity"
      :isShareQuantityValid="isShareQuantityValid"
      :isEditMode="false"
      @close="showShareModal = false"
      @submit="submitShare"
      @select-food="(foodId) => { shareForm.foodItemId = foodId; onSelectFoodItem(); }"
      @location-selected="shareForm.location = $event"
      @update:quantity="shareForm.quantity = $event"
    />

    <!-- Edit Donation Modal -->
    <ShareFoodModal
      :show="showEditModal"
      :formData="editForm"
      :foodItems="[]"
      :maxShareQuantity="maxEditQuantity"
      :isShareQuantityValid="isEditQuantityValid"
      :isEditMode="true"
      @close="showEditModal = false"
      @submit="submitEdit"
      @select-food="() => {}"
      @location-selected="editForm.location = $event"
      @update:quantity="editForm.quantity = $event"
    />
  </div>
</template>

<style scoped>
/* Simplified - most styles moved to components */
.tab-content-section {
  min-height: 300px;
}
</style>
