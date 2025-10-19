<script setup>
import { ref, onMounted } from 'vue';
import { db, auth } from '../firebase.js';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from "firebase/auth"
import { orderBy } from 'firebase/firestore';


const mySharedItems = ref([])
const sharedItems = ref([])
const showContactModal = ref(false)
const showShareModal = ref(false)
const selectedContact = ref(null)
const currentUser = ref(null)

const categories = [
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

const units = ['pieces', 'kg', 'grams', 'liters', 'cups', 'servings', 'packs']

const handleContact = (item) => {
  selectedContact.value = item
  showContactModal.value = true
}

// form to upload food item for sharing
const shareForm = ref({
  foodName: '',
  category: '',
  quantity: '',
  expirationDate: '',
  pickupTime: '',
  notes: '',
  unit: '',
})

const handleShareFood = () => {
  // Reset form
  shareForm.value = {
    foodName: '',
    category: 'Fruits & Vegetables',
    quantity: 1,
    unit: 'pieces',
    expirationDate: '',
    pickupTime: '',
    notes: ''
  }
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

async function loadAllListings() {
  console.log(currentUser.value?.uid)
  if (!currentUser.value) return;

  const q = query(
    collection(db, "communityListings"),
    where("ownerId", "!=", currentUser.value.uid),
    orderBy("ownerId")
  )
  
  const snapshot = await getDocs(q)
  
  sharedItems.value = snapshot.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      daysUntilExpiration: getDaysLeft(data.expirationDate),
    }
  })
  console.log("Loaded shared items:", sharedItems.value)
  console.log(currentUser.value?.uid) 
}



async function submitShare() {
  if (!currentUser.value) return alert("Please log in first")

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
      sharedBy: currentUser.value.displayName || currentUser.value.email.split("@")[0],
      contact: {
        email: shareForm.value.contactEmail || currentUser.value.email,
        phone: shareForm.value.contactPhone || "",
        address: shareForm.value.contactAddress || "",
      },
      createdAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, "communityListings"), data)

    // Fetch the final saved document instead of immediately reloading
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
    loadAllListings()
  } else {
    currentUser.value = null
  }
})


</script>


<template>
  <div class="community-container">
    <header class="header-area">
      <div>
        <h1>Community Posts</h1>
        <p class="subtitle">Join the discussion and share your thoughts.</p>
      </div>
      <div class="actions">
        <input v-model="searchQuery" type="text" placeholder="Search posts..." class="search-input" />
      </div>

    </header>

    <main class="posts-area">
      <transition-group name="fade" tag="div">
        <div v-for="post in filteredPosts" :key="post.id" class="post-card">
          <h2>{{ post.foodName }}</h2>
          <p>
            Shared by: <strong>{{ post.sharedBy }}</strong>
            <span v-if="post.email">({{ post.email }})</span>
          </p>
          <p>Quantity: {{ post.quantity }}</p>
          <p>Expires: <span class="date">{{ formatDate(post.expirationDate) }}</span></p>
          <p>{{ post.createdAt }}</p>
        </div>
      </transition-group>
      <div v-if="filteredPosts.length === 0" class="empty-posts">No posts to show.</div>
    </main>

    <button @click="addPost" class="floating-post-btn">New Post</button>
  </div>
</template>