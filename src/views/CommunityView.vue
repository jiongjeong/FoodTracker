<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { db, auth } from '../firebase.js';
import { collection, query, where, getDocs, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from "firebase/auth"
import LocationPicker from '@/components/LocationPicker.vue';
import { loadGoogleMaps } from '@/composables/loadGoogleMap.js'


const mySharedItems = ref([])
const sharedItems = ref([])
const showContactModal = ref(false)
const showShareModal = ref(false)
const selectedContact = ref(null)
const currentUser = ref(null)
const itemsWithDistance = ref([])
const preferredLocation = ref(null)
const geometry = ref(null)
const PREFERRED_LOC_KEY = 'foodshare_preferred_location'

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
})

const handleLocationSelected = (location) => {
  shareForm.value.location = location 
}

const handleShareFood = () => {
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
  foodItems.value = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(item => item.quantity > 0);
}

function onSelectFoodItem() {
  const selected = foodItems.value.find(fi => fi.name === shareForm.value.foodName)
  if (selected) {
    shareForm.value.category = selected.category || ''

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
    where("ownerId", "==", currentUser.value.uid))

  const snapshot = await getDocs(q)
  mySharedItems.value = snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      daysUntilExpiration: getDaysLeft(data.expirationDate),
    }
  })
}


async function loadAvailableListings() {
  const sharedItemsRef = collection(db, "communityListings")
  const sharedItemsSnapshot = await getDocs(sharedItemsRef)
  sharedItems.value = sharedItemsSnapshot.docs.map(doc => ({ 
    id: doc.id, ...doc.data(), daysUntilExpiration: getDaysLeft(doc.data().expirationDate) 
  }))
  .filter(item => item.ownerId !== currentUser.value?.uid);
  console.log("Available listings loaded:", sharedItems.value)
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
      foodName: shareForm.value.foodName,
      category: shareForm.value.category,
      quantity: shareForm.value.quantity,
      unit: shareForm.value.unit,
      expirationDate: expDate,
      distance: 0,
      sharedBy: currentUser.value.displayName || (currentUser.value.email ? currentUser.value.email.split("@")[0] : 'User'),
      contact: {
        email: shareForm.value.contactEmail || currentUser.value.email,
        phone: shareForm.value.contactPhone || "",
        address: shareForm.value.contactAddress || "",
      },
      createdAt: serverTimestamp(),
      location: {
        lat: shareForm.value.location.lat,
        lng: shareForm.value.location.lng,
        address: shareForm.value.location.address || ''
      }
    }

    const docRef = await addDoc(collection(db, "communityListings"), data)

    const savedDoc = await getDoc(docRef)
    console.log("Verified Firestore document:", savedDoc.data())

    alert("Food shared successfully!")
    showShareModal.value = false
    await loadMyListings()
  } catch (err) {
    console.error("Error adding listing:", err)
  }
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser.value = user
    loadMyListings()
    loadAvailableListings()
    loadFoodItems()
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

  console.log('Distances:', itemsWithDistance.value.map(i => i.distance))
}

/* Re‑calculate whenever sharedItems or preferredLocation changes */
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

// Optional: Keep for debugging
watch(preferredLocation, (newVal) => {
  console.log('preferredLocation changed:', newVal)
})

</script>


<template>
  <div class="container-fluid p-4">
    <div class="mb-4 d-flex justify-content-between align-items-start">
      <div>
        <h1 class="h2 mb-2">Community Food Sharing</h1>
        <p class="text-muted">Share expiring food with neighbors to reduce waste</p>
      </div>

      <div v-if="!preferredLocation" class="mb-3">
        <label class="form-label">Preferred Pickup Location</label>
        <LocationPicker @place-selected="setPreferredLocation" />
      </div>

      <div v-else class="mb-3">
        <span>
          <strong>{{ preferredLocation.address }}</strong>
        </span>
        <LocationPicker @place-selected="setPreferredLocation" class="d-inline-block" />
        <button @click="clearPreferredLocation" class="btn btn-sm btn-outline-danger">Clear</button>
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
        <div v-for="item in mySharedItems" :key="item.id" class="col-12 col-md-6 col-lg-4">
          <div class="card h-100">
            <div class="card-body">
              <h5 class="card-title mb-2">{{ item.foodName }}</h5>
              <p class="text-muted mb-0">{{ item.quantity }} {{ item.unit }}</p>
              <span class="badge badge-warning-orange mt-2">
                Expires in {{ item.daysUntilExpiration }} day{{ item.daysUntilExpiration !== 1 ? 's' : '' }}
              </span>
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
                <p class="text-muted mb-0">{{ item.quantity }}</p>
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
                <div class="avatar" style="width: 32px; height: 32px; font-size: 0.75rem;">
                  {{ item.avatar }}
                </div>
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

          <div class="modal-body">
            <form @submit.prevent="submitShare">
              <div class="mb-3">
                <label class="form-label">Food Name *</label>
                <select v-model="shareForm.foodName" class="form-select" @change="onSelectFoodItem" required>
                  <option value="" disabled>Select a food item...</option>
                  <option v-for="item in foodItems" :key="item.id" :value="item.name">
                    {{ item.name }}
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
                  <input v-model.number="shareForm.quantity" type="number" class="form-control" min="1" step="0.01" />
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
  </div>
</template>

<style scoped>
/* Modal backdrop and positioning fixes */
.modal {
  position: fixed !important;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
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
  width: 100%;
  padding: 0 1rem;
}

.modal-content {
  position: relative;
  background: #fff;
  border: none;
  border-radius: 0.75rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
  max-height: calc(100vh - 3.5rem);
  display: flex;
  flex-direction: column;
}

/* Ensure modal appears above everything */
.modal.show {
  display: flex !important;
  align-items: flex-start;
  justify-content: center;
  padding-top: 1.75rem;
  padding-bottom: 1.75rem;
}

/* Make modal body scrollable */
.modal-body {
  overflow-y: auto;
  max-height: calc(100vh - 200px);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .modal-dialog {
    margin: 0.5rem auto;
    max-width: calc(100% - 1rem);
    padding: 0 0.5rem;
  }

  .modal-content {
    max-height: calc(100vh - 1rem);
  }

  .modal-body {
    max-height: calc(100vh - 150px);
    padding: 1rem;
  }

  .modal-header,
  .modal-footer {
    padding: 0.75rem 1rem;
  }

  .modal-title {
    font-size: 1.1rem;
  }

  /* Stack buttons on small screens */
  .modal-footer {
    flex-direction: column;
    gap: 0.5rem;
  }

  .modal-footer .btn {
    width: 100%;
  }
}

@media (max-width: 576px) {
  .modal-dialog {
    margin: 0.25rem auto;
    max-width: calc(100% - 0.5rem);
    padding: 0 0.25rem;
  }

  .modal-content {
    max-height: calc(100vh - 0.5rem);
    border-radius: 0.5rem;
  }

  .modal-body {
    max-height: calc(100vh - 120px);
    padding: 0.75rem;
  }

  .modal-header,
  .modal-footer {
    padding: 0.5rem 0.75rem;
  }

  .modal-title {
    font-size: 1rem;
  }

  /* Smaller form elements on mobile */
  .form-label {
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
  }

  .form-control,
  .form-select {
    font-size: 0.9rem;
    padding: 0.5rem 0.75rem;
  }

  textarea.form-control {
    min-height: 80px;
  }

  .btn {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
}

/* Landscape mobile devices */
@media (max-height: 600px) and (orientation: landscape) {
  .modal-dialog {
    margin: 0.25rem auto;
  }

  .modal-content {
    max-height: calc(100vh - 0.5rem);
  }

  .modal-body {
    max-height: calc(100vh - 100px);
    padding: 0.5rem 1rem;
  }

  .modal-header,
  .modal-footer {
    padding: 0.5rem 1rem;
  }
}

/* Tablet portrait */
@media (min-width: 577px) and (max-width: 768px) {
  .modal-dialog {
    max-width: 90%;
  }
}

/* Tablet landscape and small desktop */
@media (min-width: 769px) and (max-width: 1024px) {
  .modal-dialog {
    max-width: 600px;
  }
}

/* Large screens */
@media (min-width: 1025px) {
  .modal-dialog {
    max-width: 650px;
  }

  .modal-body {
    max-height: calc(100vh - 250px);
  }
}

/* Ensure scrollbar is visible but styled */
.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
