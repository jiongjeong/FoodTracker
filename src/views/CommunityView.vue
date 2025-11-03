<script setup>
import { ref, onMounted, watch, computed, nextTick } from 'vue'
import { db, auth } from '../firebase.js'
import { collection, query, where, getDocs, addDoc, serverTimestamp, getDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from "firebase/auth"
import LocationPicker from '@/components/LocationPicker.vue'
import ShareFoodModal from '@/components/community/ShareFoodModal.vue'
import { loadGoogleMaps } from '@/composables/loadGoogleMap.js'
import { useAlert } from '@/composables/useAlert'

const { success, error, warning, confirm } = useAlert()

const locationPickerRef = ref(null)

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

const showDonatedItems = ref(false)

// Show my shared items
const displayedMySharedItems = computed(() => {
  const sorted = [...mySharedItems.value].sort((a, b) => {
    if (!a.donated && b.donated) return -1
    if (a.donated && !b.donated) return 1
    return 0
  })

  // Filter based on toggle
  if (showDonatedItems.value) {
    return sorted
  } else {
    return sorted.filter(item => !item.donated)
  }
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
      foodName: data.foodName, // Store food name for reference
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

  if (locationPickerRef.value) {
    locationPickerRef.value.reset()
  }
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
  <!-- Hero Section with Gradient Background -->
  <div class="compact-hero position-relative py-4 py-md-5 mb-4 hero-section">
    <!-- Community Connection Background -->
    <div class="position-absolute top-0 start-0 w-100 h-100 community-connections" style="z-index: 0;">
      <!-- Decorative Blobs - matching recipe page style -->
      <div class="position-absolute top-0 end-0 h-100 w-50 community-blobs pe-none">
        <div class="blob blob-green position-absolute top-0 end-0 rounded-circle opacity-75 shadow"></div>
        <div class="blob blob-blue position-absolute bottom-0 end-0 rounded-circle opacity-75 shadow"></div>
      </div>

      <!-- Connection Network Animation -->
      <svg class="connection-network position-absolute w-100 h-100" viewBox="0 0 800 400" preserveAspectRatio="none">
        <defs>
          <radialGradient id="nodeGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:#10b981;stop-opacity:0.8" />
            <stop offset="100%" style="stop-color:#10b981;stop-opacity:0.2" />
          </radialGradient>
        </defs>

        <!-- Connection nodes -->
        <circle class="connection-node node-1" cx="120" cy="150" r="6" fill="url(#nodeGradient)"/>
        <circle class="connection-node node-2" cx="280" cy="120" r="5" fill="url(#nodeGradient)"/>
        <circle class="connection-node node-3" cx="450" cy="180" r="7" fill="url(#nodeGradient)"/>
        <circle class="connection-node node-4" cx="600" cy="140" r="5" fill="url(#nodeGradient)"/>
        <circle class="connection-node node-5" cx="180" cy="280" r="6" fill="url(#nodeGradient)"/>
        <circle class="connection-node node-6" cx="380" cy="250" r="5" fill="url(#nodeGradient)"/>
        <circle class="connection-node node-7" cx="520" cy="260" r="6" fill="url(#nodeGradient)"/>
        <circle class="connection-node node-8" cx="350" cy="100" r="4" fill="url(#nodeGradient)"/>
        <circle class="connection-node node-9" cx="90" cy="220" r="5" fill="url(#nodeGradient)"/>

        <!-- Main connection lines between nodes -->
        <line class="connection-link link-1" x1="120" y1="150" x2="280" y2="120" stroke="#10b981" stroke-width="1.5" opacity="0.4"/>
        <line class="connection-link link-2" x1="280" y1="120" x2="450" y2="180" stroke="#10b981" stroke-width="1.5" opacity="0.4"/>
        <line class="connection-link link-3" x1="450" y1="180" x2="600" y2="140" stroke="#10b981" stroke-width="1.5" opacity="0.4"/>
        <line class="connection-link link-4" x1="120" y1="150" x2="180" y2="280" stroke="#10b981" stroke-width="1.5" opacity="0.4"/>
        <line class="connection-link link-5" x1="180" y1="280" x2="380" y2="250" stroke="#10b981" stroke-width="1.5" opacity="0.4"/>
        <line class="connection-link link-6" x1="380" y1="250" x2="450" y2="180" stroke="#10b981" stroke-width="1.5" opacity="0.4"/>

        <!-- Additional connection lines for richer network -->
        <line class="connection-link link-7" x1="450" y1="180" x2="520" y2="260" stroke="#10b981" stroke-width="1.2" opacity="0.3"/>
        <line class="connection-link link-8" x1="280" y1="120" x2="350" y2="100" stroke="#10b981" stroke-width="1.2" opacity="0.3"/>
        <line class="connection-link link-9" x1="350" y1="100" x2="450" y2="180" stroke="#10b981" stroke-width="1.2" opacity="0.3"/>
        <line class="connection-link link-10" x1="120" y1="150" x2="90" y2="220" stroke="#10b981" stroke-width="1.2" opacity="0.3"/>
        <line class="connection-link link-11" x1="90" y1="220" x2="180" y2="280" stroke="#10b981" stroke-width="1.2" opacity="0.3"/>
        <line class="connection-link link-12" x1="380" y1="250" x2="520" y2="260" stroke="#10b981" stroke-width="1.2" opacity="0.3"/>
        <line class="connection-link link-13" x1="520" y1="260" x2="600" y2="140" stroke="#10b981" stroke-width="1.2" opacity="0.3"/>
        <line class="connection-link link-14" x1="350" y1="100" x2="600" y2="140" stroke="#10b981" stroke-width="1" opacity="0.25"/>

        <!-- Animated pulse lines -->
        <line class="pulse-line pulse-1" x1="120" y1="150" x2="280" y2="120" stroke="#22c55e" stroke-width="2" opacity="0"/>
        <line class="pulse-line pulse-2" x1="280" y1="120" x2="450" y2="180" stroke="#22c55e" stroke-width="2" opacity="0"/>
        <line class="pulse-line pulse-3" x1="450" y1="180" x2="600" y2="140" stroke="#22c55e" stroke-width="2" opacity="0"/>
        <line class="pulse-line pulse-4" x1="180" y1="280" x2="380" y2="250" stroke="#22c55e" stroke-width="2" opacity="0"/>
        <line class="pulse-line pulse-5" x1="350" y1="100" x2="450" y2="180" stroke="#22c55e" stroke-width="2" opacity="0"/>
        <line class="pulse-line pulse-6" x1="380" y1="250" x2="520" y2="260" stroke="#22c55e" stroke-width="2" opacity="0"/>
      </svg>
    </div>

  <div class="container-fluid px-3 px-md-4 position-relative" style="z-index: 10;">
    <div class="row align-items-center g-5">
      <!-- Left: Title & Description -->
      <div class="col-lg-6">
        <div class="hero-content">
          <h1 class="display-5 fw-bold mb-3" style="line-height: 1.3; white-space: nowrap;">
            <span class="text-success">Community</span><br>
            <span class="typing-line-1">Food Sharing</span>
          </h1>
          <p class="lead text-dark mb-4">
            Share expiring food with neighbours<br>
            to reduce waste and build community
          </p>

          <!-- Stats Row -->
          <div class=" d-flex gap-4 flex-wrap">
            <div class="stats-card d-flex align-items-center gap-3 px-4 py-3 rounded-4"
                 style="background: rgba(255, 255, 255, 0.3); backdrop-filter: blur(10px);">
              <i class="bi bi-people-fill fs-2 text-dark"></i>
              <div>
                <strong class="d-block fs-5 text-dark">{{ mySharedItems.length }}</strong>
                <small class="text-dark">Items Shared</small>
              </div>
            </div>
            <div class=" stats-card d-flex align-items-center gap-3 px-4 py-3 rounded-4"
                 style="background: rgba(255, 255, 255, 0.3); backdrop-filter: blur(10px);">
              <i class="bi bi-box-seam fs-2 text-dark"></i>
              <div>
                <strong class="d-block fs-5 text-dark">{{ itemsWithDistance.length }}</strong>
                <small class="text-dark">Available</small>
              </div>
            </div>
            <div class=" stats-card d-flex align-items-center gap-3 px-4 py-3 rounded-4"
                 style="background: rgba(255, 255, 255, 0.3); backdrop-filter: blur(10px);">
              <i class="bi bi-recycle fs-2 text-dark"></i>
              <div>
                <strong class="d-block fs-5 text-dark">Zero</strong>
                <small class="text-dark">Waste Goal</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Location Picker Card (replacing grocery bag) -->
      <div class="col-lg-6">
        <div class="location-picker-card card border-0 shadow-lg rounded-4 position-relative p-1"
             style="min-height: 300px; transition: all 0.3s ease;">

          <!-- Step Badge -->
          <div class="step-badge position-absolute d-flex align-items-center justify-content-center rounded-circle fw-bold shadow-lg"
               style="top: -12px; left: -12px; width: 56px; height: 56px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; font-size: 1.25rem;">
            <i class="bi bi-geo-alt-fill"></i>
          </div>

          <div class="card-body p-4 text-center">
            <!-- Centered Icon -->
            <div class="mx-auto mb-4 rounded-circle d-flex align-items-center justify-content-center"
                 style="width: 80px; height: 80px; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); color: #22c55e; transition: all 0.3s ease;">
              <i class="bi bi-pin-map-fill" style="font-size: 2.5rem;"></i>
            </div>

            <!-- Title -->
            <h3 class="fw-bold mb-2 fs-4">Pickup Location</h3>
            <p class="text-muted mb-4">Find items near you</p>

            <!-- Location Picker Body -->
            <div class="mt-2">
              <!-- No location selected -->
              <template v-if="!preferredLocation">
                <div class="text-center py-4">
                  <p class="text-muted mb-3">Set your preferred location to see distances</p>
                  <LocationPicker @place-selected="setPreferredLocation" class="" />
                </div>
              </template>

              <!-- Location selected -->
              <template v-else>
                <div>
                  <div class="d-flex align-items-start gap-3 p-3 rounded-3 border border-2 text-start"
                       style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);">
                    <i class="bi bi-geo-alt-fill text-success fs-4 mt-1"></i>
                    <div class="flex-grow-1">
                      <strong class="d-block">Current Location</strong>
                      <small class="text-muted">{{ preferredLocation.address }}</small>
                    </div>
                    <button @click="clearPreferredLocation"
                            class="btn btn-sm btn-outline-danger rounded-circle p-0"
                            style="width: 32px; height: 32px;"
                            title="Clear location">
                      <i class="bi bi-x-lg"></i>
                    </button>
                  </div>

                  <div class="mt-3 text-start">
                    <label class="form-label text-muted small mb-2">
                      <i class="bi bi-arrow-repeat me-1"></i>
                      Change Location
                    </label>
                    <LocationPicker ref="locationPickerRef" @place-selected="setPreferredLocation" class="w-100" />
                  </div>
                </div>
              </template>
            </div>
          </div>
          </div>
          </div>
    </div>
  </div>
</div>

  <!-- Shared Items Section -->
  <div class="section-container mb-4">
    <div class="section-header">
      <div class="section-header-content">
        <div class="section-icon-wrapper">
          <i class="bi bi-share-fill"></i>
        </div>
        <div>
          <h3 class="section-title mb-1">My Shared Items</h3>
          <p class="section-subtitle mb-0">Manage your food donations</p>
        </div>
      </div>
      <div class="d-flex gap-2 align-items-center">
        <!-- Toggle Donated Items Button -->
        <button v-if="mySharedItems.some(item => item.donated)" class="btn btn-outline-secondary"
          @click="showDonatedItems = !showDonatedItems">
          <i :class="showDonatedItems ? 'bi bi-eye-slash' : 'bi bi-eye'" class="me-2"></i>
          {{ showDonatedItems ? 'Hide' : 'Show' }} Donated ({{mySharedItems.filter(i => i.donated).length}})
        </button>

        <!-- Share Food Button -->
        <button class="btn btn-gradient" @click="handleShareFood">
          <i class="bi bi-plus-circle-fill me-2"></i>
          Share Food
        </button>
      </div>
    </div>

    <div class="section-body">
      <!-- Empty State -->
      <div v-if="mySharedItems.length === 0" class="empty-state">
        <div class="empty-state-icon">
          <i class="bi bi-inbox"></i>
        </div>
        <h5 class="empty-state-title">No items shared yet</h5>
        <p class="empty-state-text">Start sharing food to help your community and reduce waste</p>
        <button class="btn btn-primary mt-3" @click="handleShareFood">
          <i class="bi bi-plus-lg me-2"></i>
          Share Your First Item
        </button>
      </div>

      <!-- No Active Items State -->
      <div v-else-if="displayedMySharedItems.length === 0" class="empty-state">
        <div class="empty-state-icon">
          <i class="bi bi-check-circle"></i>
        </div>
        <h5 class="empty-state-title">All items donated!</h5>
        <p class="empty-state-text">Great job! Click "Show Donated" to see your donation history</p>
      </div>

      <!-- Items Grid -->
      <div v-else class="items-grid">
        <div v-for="item in displayedMySharedItems" :key="item.id" class="item-card-wrapper">
          <div class="item-card" :class="{ 'item-card-donated': item.donated }">
            <!-- Status Badge -->
            <div class="card-status-badge" v-if="item.donated">
              <i class="bi bi-check-circle-fill me-1"></i>
              Donated
            </div>
            <div class="card-status-badge status-active" v-else>
              <i class="bi bi-clock-fill me-1"></i>
              Active
            </div>

            <!-- Action Buttons -->
            <div v-if="!item.donated" class="card-action-buttons">
              <button @click="editDonated(item)" class="action-btn action-btn-edit" title="Edit">
                <i class="bi bi-pencil-fill"></i>
              </button>
              <button @click="canDonated(item)" class="action-btn action-btn-delete" title="Cancel">
                <i class="bi bi-trash-fill"></i>
              </button>
            </div>

            <!-- Card Content -->
            <div class="card-content">
              <div class="card-image">
                <i class="bi bi-box-seam-fill"></i>
              </div>

              <div class="card-info">
                <h5 class="card-food-name">{{ item.foodName }}</h5>
                <div class="card-quantity">
                  <i class="bi bi-layers-fill me-1"></i>
                  {{ item.quantity }} {{ item.unit }}
                </div>
              </div>

              <div class="card-details">
                <div class="detail-item">
                  <i class="bi bi-geo-alt-fill"></i>
                  <span>{{ item.location?.address || 'No address' }}</span>
                </div>
                <div class="detail-item">
                  <i class="bi bi-clock-history"></i>
                  <span>{{ item.pickupTime }}</span>
                </div>
                <div class="detail-item" v-if="item.notes">
                  <i class="bi bi-chat-left-text-fill"></i>
                  <span>{{ item.notes }}</span>
                </div>
              </div>

              <div class="card-footer">
                <div class="expiry-badge" :class="{
                  'expiry-urgent': item.daysUntilExpiration <= 2,
                  'expiry-warning': item.daysUntilExpiration <= 5 && item.daysUntilExpiration > 2,
                  'expiry-normal': item.daysUntilExpiration > 5
                }">
                  <i class="bi bi-calendar-x me-1"></i>
                  <span v-if="item.donated">Was expiring in {{ item.daysUntilExpiration }} days</span>
                  <span v-else>Expires in {{ item.daysUntilExpiration }} day{{ item.daysUntilExpiration !== 1 ? 's' : ''
                    }}</span>
                </div>

                <button v-if="!item.donated" @click="markAsDonated(item)" class="btn-mark-donated">
                  <i class="bi bi-check-circle-fill me-1"></i>
                  Mark as Donated
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Available Near You Section -->
  <div class="section-container">
    <div class="section-header">
      <div class="section-header-content">
        <div class="section-icon-wrapper section-icon-available">
          <i class="bi bi-geo-alt-fill"></i>
        </div>
        <div>
          <h3 class="section-title mb-1">Available Near You</h3>
          <p class="section-subtitle mb-0">Food items from your community</p>
        </div>
      </div>
      <div class="items-count-badge">
        <i class="bi bi-basket3-fill me-2"></i>
        {{ itemsWithDistance.length }} Items
      </div>
    </div>

    <div class="section-body">
      <!-- Empty State -->
      <div v-if="itemsWithDistance.length === 0" class="empty-state">
        <div class="empty-state-icon">
          <i class="bi bi-basket"></i>
        </div>
        <h5 class="empty-state-title">No items available</h5>
        <p class="empty-state-text">Check back later for food donations in your area</p>
      </div>

      <!-- Items Grid -->
      <div v-else class="items-grid">
        <div v-for="item in itemsWithDistance" :key="item.id" class="item-card-wrapper">
          <div class="item-card item-card-available">
            <!-- Distance Badge -->
            <div class="distance-badge" v-if="preferredLocation && item.distance">
              <i class="bi bi-pin-map-fill me-1"></i>
              {{ item.distance }}
            </div>

            <!-- Card Content -->
            <div class="card-content">
              <div class="card-image card-image-available">
                <i class="bi bi-basket2-fill"></i>
              </div>

              <div class="card-info">
                <h5 class="card-food-name">{{ item.foodName }}</h5>
                <div class="card-quantity">
                  <i class="bi bi-layers-fill me-1"></i>
                  {{ item.quantity }} {{ item.unit }}
                </div>
                <div class="shared-by">
                  <i class="bi bi-person-circle me-1"></i>
                  by {{ item.sharedBy || 'Anonymous' }}
                </div>
              </div>

              <div class="card-details">
                <div class="detail-item">
                  <i class="bi bi-geo-alt-fill"></i>
                  <span>{{ item.location?.address || 'No address' }}</span>
                </div>
                <div class="detail-item">
                  <i class="bi bi-clock-history"></i>
                  <span>{{ item.pickupTime }}</span>
                </div>
                <div class="detail-item" v-if="item.notes">
                  <i class="bi bi-chat-left-text-fill"></i>
                  <span class="text-truncate">{{ item.notes }}</span>
                </div>
              </div>

              <div class="card-footer">
                <div class="expiry-badge" :class="{
                  'expiry-urgent': item.daysUntilExpiration <= 2,
                  'expiry-warning': item.daysUntilExpiration <= 5 && item.daysUntilExpiration > 2,
                  'expiry-normal': item.daysUntilExpiration > 5
                }">
                  <i class="bi bi-calendar-x me-1"></i>
                  {{ item.daysUntilExpiration }} day{{ item.daysUntilExpiration !== 1 ? 's' : '' }} left
                </div>

                <button @click="handleContact(item)" class="btn-contact">
                  <i class="bi bi-telephone-fill me-1"></i>
                  Contact {{ item.sharedBy?.split(' ')[0] || 'Donor' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Contact Modal -->
  <div v-if="showContactModal" class="modal fade show d-block" tabindex="-1" style="z-index: 1055;">
    <div class="modal-backdrop fade show" @click="showContactModal = false" style="z-index: 1050;"></div>
    <div class="modal-dialog modal-dialog-centered contact-modal-dialog" style="z-index: 1060;">
      <div class="modal-content contact-modal-content">
        <!-- Header -->
        <div class="contact-modal-header">
          <h5 class="contact-name">{{ selectedContact?.foodName }}</h5>
          <button type="button" class="btn-close" @click="showContactModal = false"></button>
        </div>

        <div class="modal-body contact-modal-body">
          <!-- Shared By -->
          <div class="contact-info-item">
            <i class="bi bi-person-fill"></i>
            <span class="contact-label">Shared by:</span>
            <span class="contact-value">{{ selectedContact?.sharedBy }}</span>
          </div>

          <!-- Quantity -->
          <div class="contact-info-item">
            <i class="bi bi-layers-fill"></i>
            <span class="contact-label">Quantity:</span>
            <span class="contact-value">{{ selectedContact?.quantity }} {{ selectedContact?.unit }}</span>
          </div>

          <!-- Expiration -->
          <div class="contact-info-item">
            <i class="bi bi-calendar-check"></i>
            <span class="contact-label">Expires in:</span>
            <span class="contact-value" :class="{
              'text-danger': selectedContact?.daysUntilExpiration <= 2,
              'text-warning': selectedContact?.daysUntilExpiration <= 5 && selectedContact?.daysUntilExpiration > 2,
              'text-success': selectedContact?.daysUntilExpiration > 5
            }">
              {{ selectedContact?.daysUntilExpiration }} day{{ selectedContact?.daysUntilExpiration !== 1 ? 's' : '' }}
            </span>
          </div>

          <!-- Email -->
          <div class="contact-info-item" v-if="selectedContact?.contact?.email">
            <i class="bi bi-envelope-fill"></i>
            <span class="contact-label">Email:</span>
            <a :href="`mailto:${selectedContact.contact.email}`" class="contact-value contact-link">
              {{ selectedContact.contact.email }}
            </a>
          </div>

          <!-- Phone -->
          <div class="contact-info-item" v-if="selectedContact?.contact?.phone && selectedContact.contact.phone !== 'Not provided'">
            <i class="bi bi-telephone-fill"></i>
            <span class="contact-label">Phone:</span>
            <a :href="`tel:${selectedContact.contact.phone}`" class="contact-value contact-link">
              {{ selectedContact.contact.phone }}
            </a>
          </div>

          <!-- Handle -->
          <div class="contact-info-item" v-if="selectedContact?.contact?.handle">
            <i class="bi bi-at"></i>
            <span class="contact-label">Telegram:</span>
            <span class="contact-value">{{ selectedContact.contact.handle }}</span>
          </div>

          <!-- Pickup Time -->
          <div class="contact-info-item" v-if="selectedContact?.pickupTime && selectedContact.pickupTime !== 'Not specified'">
            <i class="bi bi-clock-fill"></i>
            <span class="contact-label">Pickup Time:</span>
            <span class="contact-value">{{ selectedContact.pickupTime }}</span>
          </div>

          <!-- Location -->
          <div class="contact-info-item" v-if="selectedContact?.location?.address">
            <i class="bi bi-geo-alt-fill"></i>
            <span class="contact-label">Location:</span>
            <span class="contact-value">{{ selectedContact.location.address }}</span>
          </div>

          <!-- Map -->
          <div class="contact-map" v-if="selectedContact?.location?.lat && selectedContact?.location?.lng">
            <a :href="getGoogleMapsUrl(selectedContact.location)" target="_blank" class="map-link">
              <iframe
                :src="`https://www.google.com/maps?q=${selectedContact.location.lat},${selectedContact.location.lng}&output=embed&z=15`"
                class="map-iframe" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
              <div class="map-overlay">
                <i class="bi bi-box-arrow-up-right me-2"></i>Open in Google Maps
              </div>
            </a>
          </div>

          <!-- Notes -->
          <div class="contact-notes" v-if="selectedContact?.notes">
            <label><i class="bi bi-chat-left-text-fill me-2"></i>Notes:</label>
            <p>{{ selectedContact.notes }}</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="contact-modal-footer">
          <button type="button" class="btn btn-primary w-100" @click="showContactModal = false">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>

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
</template>

<style scoped>
/* Hero Section */
.hero-section {
  background: linear-gradient(135deg, #fefefe 0%, #f9f7f4 40%, #f5f2ed 100%);
  overflow: hidden;
}

/* Community Connection Animations */
.community-connections {
  pointer-events: none;
}

/* Decorative Blobs - matching recipe page style */
.community-blobs {
  z-index: 0;
}

.blob {
  width: 280px;
  height: 280px;
}

.blob-green {
  background: radial-gradient(circle at 30% 30%, #34d399, #10b981);
  transform: translate(20%, -20%);
  animation: blobFloat1 8s ease-in-out infinite;
}

.blob-blue {
  width: 220px;
  height: 220px;
  background: radial-gradient(circle at 70% 70%, #60a5fa, #3b82f6);
  transform: translate(20%, 20%);
  animation: blobFloat2 10s ease-in-out infinite reverse;
}

@keyframes blobFloat1 {
  0%, 100% { transform: translate(20%, -20%) scale(1); }
  50% { transform: translate(25%, -15%) scale(1.05); }
}

@keyframes blobFloat2 {
  0%, 100% { transform: translate(20%, 20%) scale(1); }
  50% { transform: translate(15%, 25%) scale(0.95); }
}

/* Connection Network Animation */
.connection-network {
  pointer-events: none;
  opacity: 0.7;
}

/* Connection nodes with subtle pulse */
.connection-node {
  animation: nodePulse 4s ease-in-out infinite;
}

.node-1 { animation-delay: 0s; }
.node-2 { animation-delay: 0.4s; }
.node-3 { animation-delay: 0.8s; }
.node-4 { animation-delay: 1.2s; }
.node-5 { animation-delay: 1.6s; }
.node-6 { animation-delay: 2s; }
.node-7 { animation-delay: 2.4s; }
.node-8 { animation-delay: 2.8s; }
.node-9 { animation-delay: 3.2s; }

@keyframes nodePulse {
  0%, 100% {
    r: 5;
    opacity: 0.6;
  }
  50% {
    r: 8;
    opacity: 1;
  }
}

/* Static connection links */
.connection-link {
  opacity: 0.3;
  transition: opacity 0.3s ease;
}

/* Animated pulse lines that travel along connections */
.pulse-line {
  stroke-linecap: round;
  animation: pulseTravelBrighter 3s ease-in-out infinite;
}

.pulse-1 { animation-delay: 0s; }
.pulse-2 { animation-delay: 0.8s; }
.pulse-3 { animation-delay: 1.6s; }
.pulse-4 { animation-delay: 2.4s; }
.pulse-5 { animation-delay: 3.2s; }
.pulse-6 { animation-delay: 4s; }

@keyframes pulseTravelBrighter {
  0% {
    opacity: 0;
    stroke-dasharray: 0, 1000;
  }
  20% {
    opacity: 0.8;
    stroke-dasharray: 20, 1000;
  }
  80% {
    opacity: 0.8;
    stroke-dasharray: 20, 1000;
    stroke-dashoffset: -100;
  }
  100% {
    opacity: 0;
    stroke-dasharray: 0, 1000;
    stroke-dashoffset: -100;
  }
}

/* Floating Community Icons */
.floating-community-icon {
  animation: communityFloat 5s ease-in-out infinite;
  pointer-events: none;
  transform-origin: center;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

@keyframes communityFloat {
  0%, 100% {
    transform: translateY(0) scale(0.9);
    opacity: 0.7;
  }
  25% {
    transform: translateY(-8px) scale(1);
    opacity: 1;
  }
  50% {
    transform: translateY(-12px) scale(1.1);
    opacity: 0.9;
  }
  75% {
    transform: translateY(-6px) scale(1.05);
    opacity: 0.8;
  }
}

/* Mobile Responsive for Community Animations */
@media (max-width: 768px) {
  .community-blobs .blob {
    opacity: 0.4;
  }

  .blob-green {
    width: 200px;
    height: 200px;
  }

  .blob-blue {
    width: 150px;
    height: 150px;
  }

  .connection-network {
    opacity: 0.4;
  }

  .floating-community-icon {
    opacity: 0.6;
    font-size: 1.2rem !important;
  }
}

@media (max-width: 575px) {
  .community-connections {
    z-index: 0 !important;
    pointer-events: none !important;
  }

  .community-blobs .blob {
    opacity: 0.2;
  }

  .connection-network {
    opacity: 0.2;
  }

  .floating-community-icon {
    opacity: 0.4;
  }
}

.hero-content h1 {
  color: #1a1a1a;
  letter-spacing: -1px;
}

.hero-content p.lead {
  color: #374151;
}
.card:hover .rounded-circle {
  transform: scale(1.1);
}

.typing-line-1 {
  overflow: hidden;
  display: inline-block;
  border-right: 3px solid #666;
  white-space: nowrap;
  width: 0;
  animation: typing 1.5s steps(12, end) forwards, blink 0.75s step-end infinite 1.5s, cursorFade 0.5s ease-out 3s forwards;
}

/* Keyframes for typing effect */
@keyframes typing {
  from { width: 0 }
  to { width: 12ch }
}

/* Cursor blink - only for 1.5 seconds after typing starts */
@keyframes blink {
  50% { border-color: transparent }
}

/* Fade out cursor after typing completes */
@keyframes cursorFade {
  to { border-color: transparent }
}




@keyframes show-text {
  to {
    opacity: 1;
    border-right: 3px solid #1a1a1a;
  }
}

@media (max-width: 992px) {
  .hero-section {
    min-height: auto;
    padding: 30px 15px;
  }

  .hero-content h1 {
    font-size: 2.5rem !important;
  }
}

.stats-card{
padding: 20px 24px;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 2px solid #e5e7eb;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
  overflow-y: hidden;
  max-width: 100%;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.icon-wrapper {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.icon-wrapper i {
  font-size: 2.5rem;
  color: white;
  animation: heartbeat 2s ease-in-out infinite;
}

@keyframes heartbeat {

  0%,
  100% {
    transform: scale(1);
  }

  10%,
  30% {
    transform: scale(1.1);
  }

  20%,
  40% {
    transform: scale(1);
  }
}

.hero-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  margin: 0;
}

.hero-subtitle {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 500;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

/* Stats Row */
.stats-row {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.stat-item:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-item i {
  font-size: 1.75rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.stat-item strong {
  display: block;
  font-size: 1.25rem;
  color: white;
  line-height: 1;
  font-weight: 700;
}

.stat-item small {
  display: block;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

/* Location Card */
.location-picker-card {
  animation: fadeInUp 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Hover effects */
.location-picker-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15) !important;
}

.location-picker-card:hover .icon-circle {
  transform: scale(1.1);
  background: linear-gradient(135deg, #bbf7d0 0%, #86efac 100%);
}

.location-picker-card:hover .step-badge {
  transform: scale(1.1);
  box-shadow: 0 8px 20px rgba(34, 197, 94, 0.4);
}

.location-card-header {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  padding: 1.5rem;
  color: white;
}

.location-icon {
  width: 50px;
  height: 50px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(5px);
}

.location-icon i {
  font-size: 1.5rem;
  color: white;
}

.location-card-header h5 {
  font-weight: 700;
  font-size: 1.25rem;
  margin-bottom: 0.25rem;
}

.location-card-body {
  padding: 1.5rem;
}

/* Empty Location State */
.empty-location {
  text-align: center;
  padding: 2rem 1rem;
}

.empty-location i {
  opacity: 0.3;
}

/* Selected Location */
.location-display {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-radius: 12px;
  border: 2px solid #bbf7d0;
}

.location-display>i {
  font-size: 1.5rem;
  margin-top: 0.25rem;
  flex-shrink: 0;
}

.location-display strong {
  font-size: 0.875rem;
  color: #166534;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.location-display .text-muted {
  font-size: 0.95rem;
  color: #059669 !important;
  word-break: break-word;
}

.location-display .btn-outline-danger {
  border-radius: 8px;
  padding: 0.375rem 0.75rem;
  flex-shrink: 0;
}

.change-location {
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.change-location label {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Responsive Design */
@media (max-width: 991px) {
  .hero-title {
    font-size: 2rem;
  }

  .icon-wrapper {
    width: 60px;
    height: 60px;
  }

  .icon-wrapper i {
    font-size: 2rem;
  }

  .stats-row {
    gap: 1rem;
  }

  .stat-item {
    padding: 0.5rem 1rem;
  }
}

@media (max-width: 768px) {
  .hero-section {
    margin: -1rem 0 1.5rem 0;
    padding: 1.5rem 1;
  }

  .hero-title {
    font-size: 1.75rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .icon-wrapper {
    width: 50px;
    height: 50px;
  }

  .icon-wrapper i {
    font-size: 1.5rem;
  }

  .stats-row {
    justify-content: space-between;
  }

  .stat-item {
    flex: 1;
    min-width: calc(33.333% - 0.75rem);
    padding: 0.5rem;
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }

  .stat-item i {
    font-size: 1.5rem;
  }

  .stat-item strong {
    font-size: 1.1rem;
  }

  .location-card {
    border-radius: 16px;
  }
}

@media (max-width: 480px) {
  .hero-section {
    padding: 1.5rem 0.75rem;
  }

  .hero-title {
    font-size: 1.5rem;
  }

  .hero-subtitle {
    font-size: 0.9rem;
  }

  .stats-row {
    gap: 0.5rem;
  }

  .stat-item {
    min-width: calc(50% - 0.25rem);
  }
}

/* Section Container */
.section-container {
  background: white;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.section-container:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

/* Section Header */
.section-header {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 3px solid #e5e7eb;
}

.section-header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.section-icon-wrapper {
  width: 60px;
  height: 60px;
  background: rgb(27, 161, 27);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.section-icon-available {
  background: orange;
  box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
}

.section-icon-wrapper i {
  font-size: 1.75rem;
  color: white;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
}

.section-subtitle {
  font-size: 0.95rem;
  color: #64748b;
  font-weight: 500;
}

.btn-gradient {
  background: rgb(60, 60, 243);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
}

.btn-gradient:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
}

.items-count-badge {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 0.625rem 1.25rem;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.95rem;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

/* Section Body */
.section-body {
  padding: 2rem;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-state-icon {
  width: 120px;
  height: 120px;
  margin: 0 auto 1.5rem;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state-icon i {
  font-size: 4rem;
  color: #94a3b8;
}

.empty-state-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #475569;
  margin-bottom: 0.5rem;
}

.empty-state-text {
  color: #94a3b8;
  font-size: 1rem;
  margin-bottom: 0;
}

/* Items Grid */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
  /* Reduced gap for tighter layout */
}

/* Item Card */
.item-card-wrapper {
  animation: fadeInUp 0.5s ease;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.item-card {
  background: white;
  border-radius: 12px;
  /* Slightly reduced */
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  position: relative;
  border: 2px solid #f1f5f9;
}

.item-card:hover {
  transform: translateY(-6px);
  /* Reduced hover lift */
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
  border-color: #667eea;
}

.item-card-available {
  border-color: #fce7f3;
}

.item-card-available:hover {
  border-color: #f5576c;
}

/* Donated Card */
.item-card-donated {
  opacity: 0.65;
  filter: grayscale(50%);
}

.item-card-donated:hover {
  transform: translateY(-4px);
}

/* Status Badge */
.card-status-badge {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 0.4rem 0.8rem;
  /* Reduced from 0.5rem 1rem */
  border-radius: 8px;
  font-size: 0.75rem;
  /* Reduced from 0.8rem */
  font-weight: 700;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
  display: flex;
  align-items: center;
}

.status-active {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

/* Distance Badge */
.distance-badge {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
  display: flex;
  align-items: center;
}

/* Action Buttons */
.card-action-buttons {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  display: flex;
  gap: 0.4rem;
  z-index: 10;
}

.action-btn {
  width: 36px;
  /* Reduced from 40px */
  height: 36px;
  border-radius: 10px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.action-btn-edit {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: white;
}

.action-btn-edit:hover {
  transform: translateY(-3px) rotate(5deg);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
}

.action-btn-delete {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.action-btn-delete:hover {
  transform: translateY(-3px) rotate(-5deg);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
}

.action-btn i {
  font-size: 1rem;
}

/* Card Content */
.card-content {
  padding: 1.1rem;
  padding-top: 3.2rem;
}

.card-image {
  width: 65px;
  height: 65px;
  margin: 0 auto 1.1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.card-image-available {
  background: lightgreen;
  box-shadow: 0 8px 20px rgba(245, 87, 108, 0.3);
}

.card-image i {
  font-size: 2rem;
  color: white;
}

.card-info {
  text-align: center;
  margin-bottom: 1.1rem;
}

.card-food-name {
  font-size: 1.1rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.card-quantity {
  display: inline-flex;
  align-items: center;
  background: #f1f5f9;
  padding: 0.4rem 0.8rem;
  border-radius: 10px;
  font-weight: 600;
  color: #475569;
  font-size: 0.9rem;
}

.shared-by {
  display: inline-flex;
  align-items: center;
  margin-top: 0.5rem;
  color: #64748b;
  font-size: 0.85rem;
  font-weight: 500;
}

/* Card Details */
.card-details {
  background: #f8fafc;
  border-radius: 12px;
  padding: 0.8rem;
  margin-bottom: 0.8rem;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.4rem 0;
  font-size: 0.85rem;
  color: #475569;
}

.detail-item:not(:last-child) {
  border-bottom: 1px solid #e2e8f0;
}

.detail-item i {
  color: #667eea;
  font-size: 1rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.detail-item span {
  flex: 1;
  word-break: break-word;
}

/* Card Footer */
.card-footer {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

/* Expiry Badge */
.expiry-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.7rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  width: 100%;
}

.expiry-urgent {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #dc2626;
  border: 2px solid #fca5a5;
}

.expiry-warning {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #d97706;
  border: 2px solid #fcd34d;
}

.expiry-normal {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #059669;
  border: 2px solid #6ee7b7;
}

/* Action Buttons */
.btn-mark-donated,
.btn-contact {
  width: 100%;
  padding: 0.65rem;
  border-radius: 10px;
  border: none;
  font-weight: 700;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-mark-donated {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
}

.btn-mark-donated:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
}

.btn-contact {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

.btn-contact:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

/* Modal backdrop and positioning fixes */
.modal {
  position: fixed !important;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.modal-backdrop {
  position: fixed !important;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  cursor: pointer;
}

.modal-dialog {
  position: relative !important;
  margin: 1.75rem auto;
  pointer-events: auto;
  max-width: 500px;
}

.modal-content {
  position: relative;
  background: #fff;
  border: none;
  border-radius: 0.75rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
}

/* Ensure modal appears above everything */
.modal.show {
  display: flex !important;
  align-items: center;
  justify-content: center;
}

/* Card body with flexbox */
.card-body {
  position: relative;
  display: flex;
  flex-direction: column;
  padding-top: 3rem;
  /* Space for buttons */
}

/* Content grows to push button to bottom */
.flex-grow-1 {
  flex-grow: 1;
}

/* Action buttons container at top right */
.action-buttons {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  display: flex;
  gap: 0.5rem;
  z-index: 10;
}

/* Remove the extra padding from card title */
.card-title {
  padding-right: 0;
  margin-right: 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* Style for action buttons */
.action-buttons .btn {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  white-space: nowrap;
  border: none;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 36px;
  min-height: 36px;
}

.action-buttons .btn i {
  font-size: 1rem;
}

/* Secondary button (Edit) */
.action-buttons .btn-secondary {
  background-color: #6c757d;
  color: white;
}

.action-buttons .btn-secondary:hover {
  background-color: #5a6268;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
}

.action-buttons .btn-secondary:active {
  transform: translateY(0);
}

/* Danger button (Cancel) */
.action-buttons .btn-danger {
  background-color: #dc3545;
  color: white;
}

.action-buttons .btn-danger:hover {
  background-color: #c82333;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
}

.action-buttons .btn-danger:active {
  transform: translateY(0);
}

/* Mark as Donated button - matches donated badge style */
.btn-success.w-100 {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #198754;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.625rem 1rem;
  transition: all 0.2s ease;
  margin-top: auto;
  box-shadow: 0 2px 4px rgba(25, 135, 84, 0.2);
}

.btn-success.w-100:hover {
  background-color: #157347;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(25, 135, 84, 0.3);
}

.btn-success.w-100:active {
  transform: translateY(0);
}

/* Donated badge - matches button style */
.donated-badge {
  background-color: #198754;
  color: white;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.625rem 1rem;
  margin-top: auto;
  box-shadow: 0 2px 4px rgba(25, 135, 84, 0.2);
}

/* Icon consistency */
.btn-success i,
.donated-badge i {
  font-size: 1rem;
}

/* Primary button (Share Food, Contact) */
.btn-primary {
  background-color: #0d6efd;
  border-color: #0d6efd;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(13, 110, 253, 0.2);
}

.btn-primary:hover {
  background-color: #0b5ed7;
  border-color: #0a58ca;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(13, 110, 253, 0.3);
}

.btn-primary:active {
  transform: translateY(0);
}

/* Modal buttons */
.modal-footer .btn {
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.modal-footer .btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.modal-footer .btn:active {
  transform: translateY(0);
}

.modal-footer .btn-secondary {
  background-color: #6c757d;
  border-color: #6c757d;
}

.modal-footer .btn-secondary:hover {
  background-color: #5a6268;
  border-color: #545b62;
}

/* Close button in modal header */
.btn-close {
  transition: all 0.2s ease;
}

.btn-close:hover {
  transform: rotate(90deg);
  opacity: 0.75;
}

/* Badges */
.badge-warning-orange {
  background-color: #ff8c42;
  color: #000;
  font-weight: 600;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
}

.badge {
  font-size: 0.85rem;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
}

/* Donated card styling */
.card-donated {
  opacity: 0.6;
  background-color: #f8f9fa;
  filter: grayscale(40%);
  position: relative;
}

.card-donated::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(45deg,
      transparent,
      transparent 10px,
      rgba(0, 0, 0, 0.02) 10px,
      rgba(0, 0, 0, 0.02) 20px);
  pointer-events: none;
  border-radius: 0.375rem;
  z-index: 1;
}

.card-donated .card-body {
  position: relative;
  z-index: 2;
}

.card-donated .card-title,
.card-donated .text-muted {
  color: #868e96 !important;
}

.card-donated .badge-warning-orange {
  opacity: 0.7;
  filter: grayscale(30%);
}

/* Prevent hover effects on donated cards */
.card-donated:hover {
  transform: none;
  box-shadow: none;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .card-body {
    padding-top: 3.5rem;
    /* More space on mobile */
  }

  .action-buttons {
    top: 0.5rem;
    right: 0.5rem;
  }

  .action-buttons .btn {
    padding: 0.5rem 0.65rem;
    min-width: 32px;
    min-height: 32px;
  }

  .action-buttons .btn i {
    font-size: 0.9rem;
  }
}

/* Ensure buttons are clickable on mobile */
@media (hover: none) and (pointer: coarse) {
  .action-buttons .btn {
    min-width: 40px;
    min-height: 40px;
  }
}

/* ============================================
   CONTACT MODAL
   ============================================ */

/* Contact Modal Dialog */
.contact-modal-dialog {
  max-width: 550px;
}

.contact-modal-content {
  border-radius: 16px;
  border: none;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

/* Contact Modal Header */
.contact-modal-header {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: none;
}

.contact-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0;
}

/* Contact Modal Body */
.contact-modal-body {
  padding: 1.5rem;
  max-height: 60vh;
  overflow-y: auto;
}

.contact-info-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 3px solid #059669;
}

.contact-info-item i {
  font-size: 1.1rem;
  color: #059669;
  min-width: 20px;
  text-align: center;
}

.contact-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  min-width: 100px;
}

.contact-value {
  font-size: 0.875rem;
  color: #1e293b;
  flex: 1;
}

.contact-link {
  color: #3b82f6;
  text-decoration: none;
}

.contact-link:hover {
  text-decoration: underline;
}

/* Map */
.contact-map {
  margin-top: 1rem;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.map-link {
  display: block;
  position: relative;
  text-decoration: none;
}

.map-iframe {
  width: 100%;
  height: 200px;
  border: none;
  display: block;
  pointer-events: none;
}

.map-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  padding: 0.75rem;
  color: white;
  text-align: center;
  font-size: 0.875rem;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.3s;
}

.map-link:hover .map-overlay {
  opacity: 1;
}

/* Notes */
.contact-notes {
  margin-top: 1rem;
  padding: 1rem;
  background: #fef3c7;
  border-radius: 8px;
  border-left: 3px solid #f59e0b;
}

.contact-notes label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 0.5rem;
  display: block;
}

.contact-notes p {
  margin: 0;
  font-size: 0.875rem;
  color: #78350f;
  line-height: 1.5;
}

/* Contact Modal Footer */
.contact-modal-footer {
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

/* Responsive Design for Contact Modal */
@media (max-width: 768px) {
  .contact-modal-body {
    padding: 1rem;
  }

  .contact-label {
    min-width: 80px;
    font-size: 0.8rem;
  }

  .contact-value {
    font-size: 0.8rem;
  }
}
</style>
