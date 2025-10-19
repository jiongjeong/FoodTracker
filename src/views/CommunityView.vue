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

<script setup>
import { ref, onMounted, computed } from 'vue'
import { db } from "@/firebase"
import { collection, getDocs } from "firebase/firestore"

const listings = ref([])
const searchQuery = ref('')

onMounted(async () => {
  const colRef = collection(db, "communityListings")
  try {
    const snapshot = await getDocs(colRef)
    listings.value = snapshot.docs.map(doc => {
      const data = doc.data().contact || {}
      return {
        id: doc.id,
        address: data.address || "",
        email: data.email || "",
        phone: data.phone || "",
        createdAt: data.createdAt || "",
        daysUntilExpiration: data.daysUntilExpiration ?? null,
        distance: data.distance ?? null,
        expirationDate: data.expirationDate || "",
        foodName: data.foodName || "",
        ownerId: data.ownerId || "",
        quantity: data.quantity ?? null,
        sharedBy: data.sharedBy || "",
      }
    })
    console.log(listings)
  } catch (error) {
    console.error("Failed to fetch community listings:", error)
  }
})


const filteredPosts = computed(() => {
  if (!searchQuery.value.trim()) return listings.value
  const q = searchQuery.value.toLowerCase()
  return listings.value.filter(listing =>
    listing.foodName.toLowerCase().includes(q) ||
    listing.sharedBy.toLowerCase().includes(q)
  )
})


const formatDate = (dateStr) => {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>


<style scoped>
.community-container {
  width: 90%;
  margin: 2rem auto;
  background: white;
  padding: 2rem;
  border-radius: 0.75rem;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.10);
  font-family: Arial, sans-serif;
}

.header-area {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2rem;
  gap: 2rem;
}

h1 {
  color: #059669;
  margin: 0 0 0.5rem 0;
}

.subtitle {
  color: #555;
  margin-bottom: 0.5rem;
}

.actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.search-input {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #d1d5db;
  font-size: 1rem;
  min-width: 220px;
}

.post-btn {
  background: #059669;
  color: white;
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.post-btn:hover {
  background: #10b981;
}

.posts-area {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

@media (min-width: 700px) {
  .posts-area {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 1000px) {
  .posts-area {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

.post-card {
  width: 100%;
  background: #f9fafb;
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px rgba(64, 64, 64, 0.08);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.post-card h2 {
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.post-card p {
  color: #555;
  font-size: 1rem;
  margin-bottom: 1rem;
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  border-top: 1px solid #e5e7eb;
  padding-top: 0.75rem;
  font-size: 0.95rem;
  color: #757575;
}

.like-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #555;
  font-size: 1rem;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.text-green {
  color: #059669;
}

.comments {
  margin-left: 0.5rem;
}

.date {
  margin-left: auto;
  color: #bbb;
}

.empty-posts {
  text-align: center;
  color: #aaa;
  padding: 2rem 0;
  font-size: 1.1rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.floating-post-btn {
  position: fixed;
  right: 2.5rem;
  bottom: 2.5rem;
  z-index: 50;
  background: #059669;
  color: white;
  font-size: 1.15rem;
  font-weight: 600;
  border: none;
  border-radius: 50px;
  padding: 1rem 2.25rem;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
}

.floating-post-btn:hover {
  background: #10b981;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.16);
}
</style>
