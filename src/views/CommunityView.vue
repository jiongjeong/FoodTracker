<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { db, auth } from '../firebase.js';
import { collection, query, where, getDocs, addDoc, serverTimestamp, getDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from "firebase/auth"
import LocationPicker from '@/components/LocationPicker.vue';
import { loadGoogleMaps } from '@/composables/loadGoogleMap.js'


const mySharedItems = ref([])
const sharedItems = ref([])
const showContactModal = ref(false)
const showShareModal = ref(false)
const showEditModal = ref(false) // ← New modal for editing
const selectedContact = ref(null)
const currentUser = ref(null)
const itemsWithDistance = ref([])
const preferredLocation = ref(null)
const geometry = ref(null)
const PREFERRED_LOC_KEY = 'foodshare_preferred_location'

// Computed property to sort shared items
const sortedMySharedItems = computed(() => {
  return [...mySharedItems.value].sort((a, b) => {
    // Non-donated items first (donated = false or undefined)
    if (!a.donated && b.donated) return -1
    if (a.donated && !b.donated) return 1
    // If both have same donated status, maintain original order
    return 0
  })
})

const handleContact = (item) => {
  selectedContact.value = item
  showContactModal.value = true
}


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

// New edit form ref
const editForm = ref({
  id: '',
  foodName: '',
  category: '',
  quantity: '',
  unit: '',
  expirationDate: '',
  pickupTime: '',
  notes: '',
  location: null,
  foodItemId: ''
})

const handleShareFood = async () => {
  // DO NOT replace shareForm.value
  Object.assign(shareForm.value, {
    foodName: '',
    category: '',
    quantity: 0,
    unit: '',
    expirationDate: '',
    pickupTime: '',
    notes: '',
    location: null
  })
  showShareModal.value = true
  await nextTick() // Wait for foodItems to be loaded
  if (foodItems.value.length === 1) {
    const item = foodItems.value[0]
    shareForm.value.foodName = item.name
    onSelectFoodItem() // ← Force populate foodItemId
  }
}


// function to calculate days left until expiration
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

async function loadFoodItems() {
  if (!currentUser.value) return;
  const foodItemsRef = collection(db, "user", currentUser.value.uid, "foodItems");
  const snapshot = await getDocs(foodItemsRef);

  // Get all items for name mapping (including 0 quantity)
  const allItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

  // Build name map from ALL items
  foodNameMap.value = {}
  allItems.forEach(item => {
    foodNameMap.value[item.id] = item.name
  })

  // Only show items with quantity > 0 in the dropdown
  foodItems.value = allItems.filter(item => item.quantity > 0);
}

function onSelectFoodItem() {
  const selected = foodItems.value.find(fi => fi.name === shareForm.value.foodName)
  if (selected) {
    shareForm.value.category = selected.category || ''
    shareForm.value.foodItemId = selected.id

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
    shareForm.value.foodName = selected.name || ''
    shareForm.value.quantity = selected.quantity || ''
    shareForm.value.unit = selected.unit || ''

  }
}

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
      foodName,  // ← Use resolved name
      ...data,
      daysUntilExpiration: getDaysLeft(data.expirationDate),
      pickupTime: data.pickupTime || 'Not specified',
      notes: data.notes || ''
    }
  })
}


async function loadAvailableListings() {
  const sharedItemsRef = collection(db, "communityListings")
  const sharedItemsSnapshot = await getDocs(sharedItemsRef)
  sharedItems.value = sharedItemsSnapshot.docs.map(doc => {
    const data = doc.data()
    const foodName = foodNameMap.value[data.foodId] || 'Unknown Item'
    return {
      id: doc.id,
      foodId: data.foodId,
      foodName,  // ← Use resolved name
      ...data,
      daysUntilExpiration: getDaysLeft(data.expirationDate),
      pickupTime: data.pickupTime || 'Not specified',
      notes: data.notes || ''
    }
  }).filter(item => item.ownerId !== currentUser.value?.uid)
}



async function submitShare() {
  if (!currentUser.value) return alert("Please log in first")
  if (!shareForm.value.location?.lat || !shareForm.value.location?.lng) {
  return alert('Please select a pickup location')
}
  try {
    const expDate = new Date(shareForm.value.expirationDate)

    const data = {
      ownerId: currentUser.value.uid,
      // foodName: shareForm.value.foodName,
      foodId: shareForm.value.foodItemId,
      category: shareForm.value.category,
      quantity: shareForm.value.quantity,
      unit: shareForm.value.unit,
      expirationDate: expDate,
      pickupTime: shareForm.value.pickupTime || 'Anytime',
      notes: shareForm.value.notes || '',
      createdAt: serverTimestamp(),
      location: {
        lat: shareForm.value.location.lat,
        lng: shareForm.value.location.lng,
        address: shareForm.value.location.address || ''
      }
    }

    const docRef = await addDoc(collection(db, "communityListings"), data)
    const foodItemRef = doc(db, 'user', currentUser.value.uid, 'foodItems', shareForm.value.foodItemId)
    const currentItem = foodItems.value.find(f => f.id === shareForm.value.foodItemId)
    const currentQty = Number(currentItem?.quantity || 0)
    const newQty = currentQty - Number(shareForm.value.quantity)

    if (newQty < 0) {
      return alert('Insufficient quantity')
    }

    await updateDoc(foodItemRef, {
      quantity: newQty
    })

    await loadFoodItems()

    await updateDoc(foodItemRef, {
      quantity: Math.max(0, newQty)
    })
    const remaining = getRemainingQuantity(shareForm.value.foodName)
    if (shareForm.value.quantity > remaining) {
    return alert(`You only have ${remaining} ${shareForm.value.unit} left to share.`)
  }

    await addDoc(collection(db, 'user', currentUser.value.uid, 'activities'), {
      activityType: 'pendingDonFood',
      createdAt: new Date().toISOString(),
      category: data.category,
      price: 0,
      // foodName: data.foodName,
      foodId: data.foodId,
      quantity: data.quantity,
      unit: data.unit,
    })


    const savedDoc = await getDoc(docRef)
    console.log("Verified Firestore document:", savedDoc.data())

    alert("Food shared successfully!")
    showShareModal.value = false
    await loadMyListings()
    await loadFoodItems()
  } catch (err) {
    console.error("Error adding listing:", err)
  }
}


async function markAsDonated(item) {
  if (!confirm(`Mark "${item.foodName}" as donated?`)) return

  try {
    // Update listing
    await updateDoc(doc(db, 'communityListings', item.id), {
      donated: true,
      donatedAt: serverTimestamp()
    })

    // Log donation in user's activities
    await addDoc(collection(db, 'user', currentUser.value.uid, 'activities'), {
      activityType: 'donFood',
      category: item.category,
      createdAt: new Date().toISOString(),
      foodName: item.foodName,
      price: 0,
      quantity: item.quantity,
      unit: item.unit
    })

    alert('Marked as donated!')
    await loadMyListings()
    await loadFoodItems()
  } catch (err) {
    console.error(err)
    alert('Failed to mark as donated')
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

const getRemainingQuantity = (foodName) => {
  const item = foodItems.value.find(f => f.name === foodName)
  if (!item) return 0

  const total = Number(item.quantity) || 0
  const shared = donationActivities.value
    .filter(a => a.foodName === foodName && a.activityType === 'pendingDonFood')
    .reduce((sum, a) => sum + Number(a.quantity || 0), 0)

  return Math.max(0, total - shared)
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser.value = user
    await loadFoodItems()
    await buildFoodNameMap() // Add this
    await loadAvailableListings()
    await loadDonationActivities()
  } else {
    currentUser.value = null
  }
})


// google maps and distance
onMounted(async () => {
  const google = await loadGoogleMaps()
  geometry.value = google.maps.geometry

  await loadAvailableListings()
  await loadMyListings()
  await loadFoodItems()
  loadDonationActivities()

  loadPreferredLocation()
  calculateDistances()

})

function setPreferredLocation(place) {
  // ENSURE plain object
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
  const raw = localStorage.getItem(PREFERRED_LOC_KEY)
  console.log('Raw from localStorage:', raw)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      // ENSURE plain object
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

  if (!preferredLocation.value || !geometry.value || sharedItems.value.length === 0) {
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
      const p1 = new google.maps.LatLng(userLat, userLng)
      const p2 = new google.maps.LatLng(itemLat, itemLng)
      const meters = geometry.value.spherical.computeDistanceBetween(p1, p2)
      const km = (meters / 1000).toFixed(1)
      return { ...item, distance: `${km} km` }
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
    if (sharedItems.value.length && preferredLocation.value && geometry.value) {
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
  // Populate form with existing data
  editForm.value = {
    id: item.id,
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
    location: item.location || null,
    foodItemId: item.foodId
  }

  showEditModal.value = true
}

// Submit edit function - with proper error handling and rollback
async function submitEdit() {
  if (!currentUser.value) return alert("Please log in first")
  if (!editForm.value.location?.lat || !editForm.value.location?.lng) {
    return alert('Please select a pickup location')
  }

  try {
    const expDate = new Date(editForm.value.expirationDate)

    // Get the original listing to compare quantities
    const listingRef = doc(db, 'communityListings', editForm.value.id)
    const listingSnap = await getDoc(listingRef)

    if (!listingSnap.exists()) {
      return alert("Listing not found")
    }

    const originalListing = listingSnap.data()
    const originalQty = Number(originalListing.quantity || 0)
    const newQty = Number(editForm.value.quantity)
    const qtyDifference = newQty - originalQty

    // Validate quantity if increasing
    if (qtyDifference > 0) {
      const foodItemRef = doc(db, 'user', currentUser.value.uid, 'foodItems', editForm.value.foodItemId)
      const foodItemSnap = await getDoc(foodItemRef)

      if (foodItemSnap.exists()) {
        const currentFoodQty = Number(foodItemSnap.data().quantity || 0)

        if (currentFoodQty < qtyDifference) {
          return alert(`Insufficient quantity. You only have ${currentFoodQty} ${editForm.value.unit} available.`)
        }
      } else {
        return alert('Food item not found')
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

    // Update the community listing first
    await updateDoc(listingRef, updateData)

    // Update the food item quantity if quantity changed
    if (qtyDifference !== 0) {
      try {
        const foodItemRef = doc(db, 'user', currentUser.value.uid, 'foodItems', editForm.value.foodItemId)
        const foodItemSnap = await getDoc(foodItemRef)

        if (foodItemSnap.exists()) {
          const currentFoodQty = Number(foodItemSnap.data().quantity || 0)
          const updatedFoodQty = currentFoodQty - qtyDifference

          await updateDoc(foodItemRef, {
            quantity: updatedFoodQty
          })
        }
      } catch (foodItemError) {
        // Rollback listing update
        await updateDoc(listingRef, {
          quantity: originalQty
        })
        throw new Error('Failed to update food item quantity. Changes rolled back.')
      }
    }

    // Update the pending donation activity quantity
    try {
      const activitiesQuery = query(
        collection(db, 'user', currentUser.value.uid, 'activities'),
        where('activityType', '==', 'pendingDonFood'),
        where('foodId', '==', editForm.value.foodItemId)
      )

      const activitiesSnap = await getDocs(activitiesQuery)

      if (!activitiesSnap.empty) {
        const activityDoc = activitiesSnap.docs[0]
        await updateDoc(activityDoc.ref, {
          quantity: newQty,
          unit: editForm.value.unit
        })
      }
    } catch (activityError) {
      console.warn('Failed to update activity, but listing and food item were updated:', activityError)
      // Don't rollback for activity errors as they're not critical
    }

    alert("Listing updated successfully!")
    showEditModal.value = false
    await loadMyListings()
    await loadFoodItems()
    await loadDonationActivities()
  } catch (err) {
    console.error("Error updating listing:", err)
    alert("Failed to update listing: " + err.message)
  }
}

// Cancel donated function - with proper error handling and rollback
async function canDonated(item) {
  if (!confirm(`Are you sure you want to cancel "${item.foodName}"? This will remove it from community listings.`)) {
    return
  }

  // Store original data for potential rollback
  let deletedListing = null
  let originalFoodQty = null

  try {
    // Get the original listing quantity before deletion
    const listingRef = doc(db, 'communityListings', item.id)
    const listingSnap = await getDoc(listingRef)

    if (!listingSnap.exists()) {
      return alert("Listing not found")
    }

    deletedListing = { id: item.id, ...listingSnap.data() }
    const returnQty = Number(deletedListing.quantity || 0)

    // Get original food item quantity
    const foodItemRef = doc(db, 'user', currentUser.value.uid, 'foodItems', item.foodId)
    const foodItemSnap = await getDoc(foodItemRef)

    if (!foodItemSnap.exists()) {
      return alert('Food item not found. Cannot cancel donation.')
    }

    originalFoodQty = Number(foodItemSnap.data().quantity || 0)
    const newQty = originalFoodQty + returnQty

    // Delete the listing first
    await deleteDoc(listingRef)

    // Return quantity back to food items
    try {
      await updateDoc(foodItemRef, {
        quantity: newQty
      })
    } catch (foodItemError) {
      // Rollback: Recreate the listing
      await addDoc(collection(db, 'communityListings'), deletedListing)
      throw new Error('Failed to update food item quantity. Listing restored.')
    }

    // Remove pending donation activity
    try {
      const activitiesQuery = query(
        collection(db, 'user', currentUser.value.uid, 'activities'),
        where('activityType', '==', 'pendingDonFood'),
        where('foodId', '==', item.foodId)
      )

      const activitiesSnap = await getDocs(activitiesQuery)

      if (!activitiesSnap.empty) {
        const deletePromises = activitiesSnap.docs.map(doc => deleteDoc(doc.ref))
        await Promise.all(deletePromises)
      }
    } catch (activityError) {
      console.warn('Failed to delete activities, but listing was cancelled:', activityError)
      // Don't rollback for activity errors as they're not critical
    }

    alert('Donation cancelled successfully!')

    // Reload all data to reflect changes
    await loadMyListings()
    await loadFoodItems()
    await loadDonationActivities()
  } catch (err) {
    console.error('Error canceling donation:', err)
    alert('Failed to cancel donation: ' + err.message)

    // Reload to show current state
    await loadMyListings()
    await loadFoodItems()
    await loadDonationActivities()
  }
}
</script>


<template>
  <div class="container-fluid p-4">
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-start gap-4">
      <!-- Title & subtitle -->
      <div>
        <h1 class="h2 mb-2">Community Food Sharing</h1>
        <p class="text-muted">Share expiring food with neighbors to reduce waste</p>
      </div>

      <!-- Location picker (right side) -->
      <div class="d-flex flex-column gap-2 align-self-md-start" style="min-width: 280px;">
        <label class="form-label fw-medium">
          <i class="bi bi-geo-alt-fill me-1"></i> Preferred Pickup Location
        </label>

        <!-- No location selected -->
        <template v-if="!preferredLocation">
          <LocationPicker @place-selected="setPreferredLocation" class="w-100" />
        </template>

        <!-- Location selected -->
        <template v-else>
          <!-- Picker (change) -->
          <LocationPicker
            @place-selected="setPreferredLocation"
            class="w-100"
            style="max-width: 300px;"
          />

          <!-- Address BELOW the picker -->
          <div class="d-flex align-items-center gap-2 mt-1">
            <div
              class="bg-light rounded px-3 py-1 text-dark text-truncate flex-grow-1"
              style="font-size: 0.9rem; max-width: 260px;"
              :title="preferredLocation.address"
            >
              <strong>{{ preferredLocation.address }}</strong>
            </div>

            <button
              @click="clearPreferredLocation"
              class="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
              title="Clear location"
            >
              <i class="bi bi-x-circle"></i>
              <span class="d-none d-sm-inline">Clear</span>
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>

    <div class="glass-card p-4 mb-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h3 class="h5 mb-0">My Shared Items</h3>
        <button class="btn btn-primary" @click="handleShareFood">
          <i class="bi bi-plus-lg me-2"></i> Share Food
        </button>
      </div>

      <div v-if="mySharedItems.length === 0" class="text-center py-4">
        <i class="bi bi-share fs-1 text-muted"></i>
        <p class="text-muted mt-3">You haven't shared any items yet</p>
      </div>

      <div v-else class="row g-3">
        <!-- Changed from mySharedItems to sortedMySharedItems -->
        <div v-for="item in sortedMySharedItems" :key="item.id" class="col-12 col-md-6 col-lg-4">
          <div class="card h-100" :class="{ 'card-donated': item.donated }">
            <div class="card-body position-relative d-flex flex-column">
              <!-- Edit and Cancel buttons at top right -->
              <div v-if="!item.donated" class="action-buttons">
                <button
                  @click="editDonated(item)"
                  class="btn btn-sm btn-secondary"
                  title="Edit"
                >
                  <i class="bi bi-pencil-square"></i>
                </button>

                <button
                  @click="canDonated(item)"
                  class="btn btn-sm btn-danger"
                  title="Cancel"
                >
                  <i class="bi bi-x-circle"></i>
                </button>
              </div>

              <!-- Content section -->
              <div class="flex-grow-1">
                <h5 class="card-title mb-2">{{ item.foodName }}</h5>
                <p class="text-muted mb-0">{{ item.quantity }} {{ item.unit }}</p>
                <p class="text-muted small mb-2">
                  <i class="bi bi-geo-alt me-1"></i>
                  {{ item.location?.address || 'No address' }}
                </p>
                <p class="text-muted small mb-2">
                  <i class="bi bi-clock me-1"></i>
                  Pickup Time: {{ item.pickupTime }}
                </p>

                <p v-if="item.notes" class="text-muted small mb-2">
                  <i class="bi bi-chat-text me-1"></i>
                  {{ item.notes }}
                </p>
                <span class="badge badge-warning-orange mt-2 text-black">
                  Expires in {{ item.daysUntilExpiration }} day{{ item.daysUntilExpiration !== 1 ? 's' : '' }}
                </span>
              </div>

              <!-- Mark as Donated button - always at bottom -->
              <button
                v-if="!item.donated"
                @click="markAsDonated(item)"
                class="btn btn-success btn-sm w-100 mt-3"
              >
                <i class="bi bi-check-circle-fill me-1"></i>
                Mark as Donated
              </button>

              <div v-else class="donated-badge w-100 text-center py-2 mt-3">
                <i class="bi bi-check-circle-fill me-1"></i>
                Donated
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="glass-card p-4">
      <h3 class="h5 mb-4">Available Near You</h3>

      <div class="row g-4">
        <div v-for="item in itemsWithDistance" :key="item.id" class="col-12 col-md-6 col-lg-4">
          <div class="card h-100">
            <div class="card-body">
              <div class="mb-3">
                <h5 class="card-title mb-2">{{ item.foodName }}</h5>
                <p class="text-muted mb-0">{{ item.quantity }} {{ item.unit }}</p>
                <p class="text-muted small mb-2">
                  <i class="bi bi-geo-alt me-1"></i>
                  {{ item.location?.address || 'No address' }}
                </p>
                <p class="text-muted small mb-2">
                  <i class="bi bi-clock me-1"></i>
                  Pickup: {{ item.pickupTime }}
                </p>
                <p v-if="item.notes" class="text-muted small mb-2 text-truncate" :title="item.notes">
                  <i class="bi bi-chat-text me-1"></i>
                  {{ item.notes }}
                </p>
              </div>

              <div class="mb-3">
                <span class="badge badge-warning-orange text-black">
                  Expires in {{ item.daysUntilExpiration }} day{{ item.daysUntilExpiration !== 1 ? 's' : '' }}
                </span>

                <span v-if="preferredLocation && item.distance" class="badge bg-light text-dark ms-2">
                  <i class="bi bi-geo-alt"></i> {{ item.distance }} away
                </span>

                <span v-else-if="preferredLocation" class="badge bg-warning text-dark">
                  Calculating...
                </span>

                <span v-else class="badge bg-light text-dark ms-2">
                  Input preferred location to see distance
                </span>
              </div>

              <div class="d-flex align-items-center gap-2 mb-3">
                <small class="text-muted">Shared by {{ item.sharedBy }}</small>
              </div>

              <button class="btn btn-primary w-100" @click="handleContact(item)">
                <i class="bi bi-person-lines-fill me-2"></i>
                Contact {{ item.sharedBy ? item.sharedBy.split(' ')[0] : 'User' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Contact Modal -->
    <div v-if="showContactModal" class="modal fade show d-block" tabindex="-1" style="z-index: 1055;">
      <div class="modal-backdrop fade show" @click="showContactModal = false" style="z-index: 1050;"></div>
      <div class="modal-dialog modal-dialog-centered" style="z-index: 1060;">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-person-circle me-2"></i>
              Contact {{ selectedContact?.sharedBy }}
            </h5>
            <button type="button" class="btn-close" @click="showContactModal = false"></button>
          </div>

          <div class="modal-body">
            <div class="mb-4">
              <h6 class="fw-semibold">About this item:</h6>
              <p class="mb-1"><strong>{{ selectedContact?.foodName }}</strong> - {{ selectedContact?.quantity }}</p>
              <small class="text-muted">Expires in {{ selectedContact?.daysUntilExpiration }} day(s)</small>
            </div>

            <div class="mb-3">
              <h6 class="fw-semibold mb-3">Contact Information:</h6>

              <div class="mb-3">
                <div class="d-flex align-items-center gap-2 mb-1">
                  <i class="bi bi-envelope text-primary"></i>
                  <strong>Email:</strong>
                </div>
                <a :href="`mailto:${selectedContact?.contact.email}`" class="text-decoration-none">
                  {{ selectedContact?.contact.email }}
                </a>
              </div>

              <div class="mb-3">
                <div class="d-flex align-items-center gap-2 mb-1">
                  <i class="bi bi-telephone text-success"></i>
                  <strong>Phone:</strong>
                </div>
                <a :href="`tel:${selectedContact?.contact.phone}`" class="text-decoration-none">
                  {{ selectedContact?.contact.phone }}
                </a>
              </div>

              <div class="mb-3">
                <div class="d-flex align-items-center gap-2 mb-1">
                  <i class="bi bi-geo-alt text-danger"></i>
                  <strong>Address:</strong>
                </div>
                <p class="mb-0">{{ selectedContact?.contact.address }}</p>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showContactModal = false">
              Close
            </button>
            <a
              :href="`mailto:${selectedContact?.contact.email}?subject=Food Request - ${selectedContact?.foodName}&body=Hi ${selectedContact?.sharedBy}, I'm interested in your ${selectedContact?.foodName}. Could we arrange a pickup?`"
              class="btn btn-primary"
            >
              <i class="bi bi-envelope me-2"></i>
              Send Email
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Share Food Modal -->
    <div v-if="showShareModal" class="modal fade show d-block" tabindex="-1" style="z-index: 1055;">
      <div class="modal-backdrop fade show" @click="showShareModal = false" style="z-index: 1050;"></div>
      <div class="modal-dialog modal-dialog-centered" style="z-index: 1060;">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-share me-2"></i>
              Share Food Item
            </h5>
            <button type="button" class="btn-close" @click="showShareModal = false"></button>
          </div>

          <div class="modal-body" style="max-height:70vh; overflow-y:auto">
            <form @submit.prevent="submitShare">
              <div class="mb-3">
                <label class="form-label">Food Name *</label>
                <select v-model="shareForm.foodName" class="form-select" @change="onSelectFoodItem" required
                :key="foodItems.map(i => i.id + ':' + i.quantity).join('|') + '|' + donationActivities.length">
                  <option value="" disabled>Select a food item...</option>
                  <option
                    v-for="item in foodItems"
                    :key="item.id"
                    :value="item.name"
                    :disabled="getRemainingQuantity(item.name) <= 0"
                    :title="
                    getRemainingQuantity(item.name) <= 0
                     ? 'No quantity left to share'
                     : `Remaining: ${getRemainingQuantity(item.name)} ${item.unit}`
                    "
                  >
                    {{ item.name }}
                    <small v-if="getRemainingQuantity(item.name) > 0" class="text-success ms-1">
                      ({{ getRemainingQuantity(item.name) }} left)
                    </small>
                    <small v-else class="text-muted ms-1">(none left)</small>
                  </option>
                </select>
              </div>

              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="form-label">Category</label>
                  <input
                    v-model="shareForm.category"
                    type="text"
                    class="form-control"
                    readonly
                    style="background-color: #e9ecef; cursor: not-allowed;"
                  />
                </div>

                <div class="col-md-6">
                  <label class="form-label">Expiration Date *</label>
                  <input
                    v-model="shareForm.expirationDate"
                    type="date"
                    class="form-control"
                    readonly
                    style="background-color: #e9ecef; cursor: not-allowed;"
                  />
                </div>
              </div>

              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="form-label">Quantity</label>
                  <input v-model.number="shareForm.quantity" type="number" class="form-control" min="1" step="1" required />
                  <small class="text-muted">
                    Max: {{ getRemainingQuantity(shareForm.foodName) }} {{ shareForm.unit }}
                  </small>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Unit</label>
                  <input
                    v-model="shareForm.unit"
                    type="text"
                    class="form-control"
                    readonly
                    style="background-color: #e9ecef; cursor: not-allowed;"
                  />
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Preferred Pickup Time</label>
                <input
                  v-model="shareForm.pickupTime"
                  type="text"
                  class="form-control"
                  placeholder="e.g., Weekdays after 6pm, Weekends anytime"
                />
              </div>

              <div class="mb-3">
                <label class="form-label">Preferred Pickup Location</label>
                <LocationPicker @place-selected="shareForm.location = $event" />
                <small v-if="shareForm.location" class="text-success d-block mt-1">
                  Selected: {{ shareForm.location.address }}
                </small>

                <small v-else class="text-danger d-block mt-1">Please select location</small>
              </div>

              <div class="mb-3">
                <label class="form-label">Additional Notes</label>
                <textarea
                  v-model="shareForm.notes"
                  class="form-control"
                  rows="3"
                  placeholder="Any special instructions or notes about the food item..."
                ></textarea>
              </div>
            </form>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showShareModal = false">
              Cancel
            </button>
            <button type="button" class="btn btn-primary" @click="submitShare">
              <i class="bi bi-share me-2"></i>
              Share Food
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Donation Modal -->
    <div v-if="showEditModal" class="modal fade show d-block" tabindex="-1" style="z-index: 1055;">
      <div class="modal-backdrop fade show" @click="showEditModal = false" style="z-index: 1050;"></div>
      <div class="modal-dialog modal-dialog-centered" style="z-index: 1060;">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-pencil-square me-2"></i>
              Edit Donation
            </h5>
            <button type="button" class="btn-close" @click="showEditModal = false"></button>
          </div>

          <div class="modal-body" style="max-height:70vh; overflow-y:auto">
            <form @submit.prevent="submitEdit">
              <div class="mb-3">
                <label class="form-label">Food Name</label>
                <input
                  v-model="editForm.foodName"
                  type="text"
                  class="form-control"
                  readonly
                  style="background-color: #e9ecef; cursor: not-allowed;"
                />
              </div>

              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="form-label">Category</label>
                  <input
                    v-model="editForm.category"
                    type="text"
                    class="form-control"
                    readonly
                    style="background-color: #e9ecef; cursor: not-allowed;"
                  />
                </div>

                <div class="col-md-6">
                  <label class="form-label">Expiration Date</label>
                  <input
                    v-model="editForm.expirationDate"
                    type="date"
                    class="form-control"
                    readonly
                    style="background-color: #e9ecef; cursor: not-allowed;"
                  />
                </div>
              </div>

              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="form-label">Quantity *</label>
                  <input
                    v-model.number="editForm.quantity"
                    type="number"
                    class="form-control"
                    min="1"
                    step="1"
                    required
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Unit</label>
                  <input
                    v-model="editForm.unit"
                    type="text"
                    class="form-control"
                    readonly
                    style="background-color: #e9ecef; cursor: not-allowed;"
                  />
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Preferred Pickup Time</label>
                <input
                  v-model="editForm.pickupTime"
                  type="text"
                  class="form-control"
                  placeholder="e.g., Weekdays after 6pm, Weekends anytime"
                />
              </div>

              <div class="mb-3">
                <label class="form-label">Preferred Pickup Location *</label>
                <LocationPicker
                  @place-selected="editForm.location = $event"
                  :initial-address="editForm.location?.address"
                />
                <small v-if="editForm.location" class="text-success d-block mt-1">
                  Selected: {{ editForm.location.address }}
                </small>
                <small v-else class="text-danger d-block mt-1">Please select location</small>
              </div>

              <div class="mb-3">
                <label class="form-label">Additional Notes</label>
                <textarea
                  v-model="editForm.notes"
                  class="form-control"
                  rows="3"
                  placeholder="Any special instructions or notes about the food item..."
                ></textarea>
              </div>
            </form>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showEditModal = false">
              Cancel
            </button>
            <button type="button" class="btn btn-primary" @click="submitEdit">
              <i class="bi bi-check-circle me-2"></i>
              Update Listing
            </button>
          </div>
        </div>
      </div>
    </div>
</template>

<style scoped>

.card .small i { vertical-align: middle; }
.card .small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  padding-top: 3rem; /* Space for buttons */
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
  justify-content: center;
  gap: 0.25rem;
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
  box-shadow: 0 4px 8px rgba(108, 117, 125, 0.3);
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
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(0, 0, 0, 0.02) 10px,
    rgba(0, 0, 0, 0.02) 20px
  );
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
    padding-top: 3.5rem; /* More space on mobile */
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
</style>
