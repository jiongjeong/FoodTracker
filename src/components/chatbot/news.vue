<template>
  <div class="news-section">
    <h2 class="section-title">�️ Food & Sustainability News</h2>

    <div class="carousel-container" ref="carousel">
      <div
        class="news-card"
        v-for="(article, index) in articles"
        :key="index"
        @click="openArticle(article.link)"
      >
        <div class="news-img-container">
          <img
            v-if="article.thumbnail"
            :src="article.thumbnail"
            alt="thumbnail"
            class="news-img"
            @error="handleImageError"
          />
          <div v-else class="news-img-placeholder">
            <span class="placeholder-icon">🍽️</span>
          </div>
        </div>
        <div class="news-content">
          <h3 class="news-title">{{ article.title }}</h3>
          <p class="news-source">{{ article.source }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const articles = ref([])
const carousel = ref(null)
let scrollInterval = null

// RSS feeds (converted to JSON) - Food & Sustainability focused
const feeds = [
  {
    name: 'CNA Sustainability',
    url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.channelnewsasia.com%2Fapi%2Fv1%2Frss-outbound-feed%3F_format%3Dxml%26category%3D10416'
  },
  {
    name: 'Bon Appétit',
    url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.bonappetit.com%2Ffeed%2Frss'
  },
  {
    name: 'Eater',
    url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.eater.com%2Frss%2Findex.xml'
  }
]

// Keywords to filter for food-related content
const foodKeywords = [
  'food', 'recipe', 'cooking', 'meal', 'ingredient', 'kitchen', 'chef',
  'eat', 'eating', 'diet', 'nutrition', 'waste', 'storage', 'fresh',
  'vegetable', 'fruit', 'meat', 'dairy', 'grocery', 'restaurant',
  'culinary', 'dish', 'cuisine', 'sustainable', 'organic', 'farm',
  'harvest', 'produce', 'expiration', 'preservation', 'leftover'
]

// Check if article title contains food-related keywords
const isFoodRelated = (title) => {
  const lowerTitle = title.toLowerCase()
  return foodKeywords.some(keyword => lowerTitle.includes(keyword))
}

const fetchNews = async () => {
  try {
    const results = await Promise.allSettled(
      feeds.map(async (feed) => {
        try {
          const response = await axios.get(feed.url)
          if (response.data && response.data.items) {
            // Filter for food-related articles and get more items initially
            return response.data.items
              .filter(item => isFoodRelated(item.title))
              .slice(0, 5)
              .map((item) => {
                // Extract thumbnail from multiple possible sources
                let thumbnail = item.thumbnail || item.enclosure?.link || null
                
                // For Guardian and other sources, try to extract from content/description
                if (!thumbnail && item.description) {
                  const imgMatch = item.description.match(/<img[^>]+src="([^">]+)"/)
                  if (imgMatch) {
                    thumbnail = imgMatch[1]
                  }
                }
                
                // For Guardian, try media content
                if (!thumbnail && item['media:content']) {
                  thumbnail = item['media:content'].url
                }
                
                return {
                  title: item.title,
                  link: item.link,
                  thumbnail: thumbnail,
                  source: feed.name
                }
              })
          }
          return []
        } catch (err) {
          console.warn(`Failed to fetch from ${feed.name}:`, err.message)
          return []
        }
      })
    )
    
    // Combine successful results
    articles.value = results
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => result.value)
      .filter(article => article) // Remove any null/undefined
    
    if (articles.value.length === 0) {
      console.warn('No food-related articles found - showing general content')
    } else {
      console.log(`Found ${articles.value.length} food-related articles`)
    }
  } catch (err) {
    console.error('Error fetching news:', err)
  }
}

const openArticle = (url) => {
  window.open(url, '_blank')
}

const handleImageError = (event) => {
  // Hide broken image and show placeholder instead
  event.target.style.display = 'none'
  const placeholder = event.target.parentElement.querySelector('.news-img-placeholder')
  if (!placeholder) {
    const newPlaceholder = document.createElement('div')
    newPlaceholder.className = 'news-img-placeholder'
    newPlaceholder.innerHTML = '<span class="placeholder-icon">🍽️</span>'
    event.target.parentElement.appendChild(newPlaceholder)
  }
}

// Auto scroll effect
const startAutoScroll = () => {
  scrollInterval = setInterval(() => {
    if (carousel.value) {
      carousel.value.scrollBy({
        left: 300,
        behavior: 'smooth'
      })
      if (
        carousel.value.scrollLeft + carousel.value.clientWidth >=
        carousel.value.scrollWidth
      ) {
        carousel.value.scrollTo({ left: 0, behavior: 'smooth' })
      }
    }
  }, 4000)
}

onMounted(async () => {
  await fetchNews()
  startAutoScroll()
})

onUnmounted(() => clearInterval(scrollInterval))
</script>

<style scoped>
.news-section {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.5);
  overflow: hidden;
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: #065f46;
  text-align: center;
  letter-spacing: -0.02em;
}

.carousel-container {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: none;
  padding: 8px 4px;
}
.carousel-container::-webkit-scrollbar {
  display: none;
}

.news-card {
  flex: 0 0 280px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.7);
}
.news-card:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 12px 24px rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.3);
}

.news-img-container {
  width: 100%;
  height: 160px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
}

.news-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.news-card:hover .news-img {
  transform: scale(1.05);
}

.news-img-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
}

.placeholder-icon {
  font-size: 3.5rem;
  opacity: 0.5;
  filter: grayscale(20%);
}

.news-content {
  padding: 16px;
  background: rgba(255, 255, 255, 0.5);
}

.news-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #064e3b;
  margin-bottom: 8px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.news-source {
  font-size: 0.75rem;
  color: #059669;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
