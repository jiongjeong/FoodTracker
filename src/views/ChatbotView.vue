<script setup>
import { ref, nextTick, computed, onMounted } from 'vue'
import news from '../components/chatbot/news.vue'
import { useGeminiAI } from '../composables/useGeminiAI'


const useUser = () => ({
  user: ref({
    currentScore: 0,
    totalSaved: 0
  })
})

const useFoodItems = () => ({
  activeFoodItems: ref([]),
  expiringSoon: ref([])
})

const { generateResponse, isLoading, error } = useGeminiAI()
const { user } = useUser()
const { activeFoodItems, expiringSoon } = useFoodItems()

const messages = ref([
  {
    id: 'welcome-1',
    text: "👋 Hello! I'm BigBacks Brain, your AI assistant for smart food management. \nHow can I help you today?",
    sender: 'ai',
    timestamp: new Date()
  }
])

const messageInput = ref('')
const chatContainer = ref(null)

const quickQuestions = [
  'How do I store bananas?',
  'Recipe ideas with expiring items?',
  'Best way to freeze bread?',
  'How to reduce food waste?',
  'Tips for meal planning'
]

// helps to hide header/cards after first interaction
const hasStarted = ref(false)
const hideFeatureCards = ref(false)
const startIfNeeded = () => {
  if (!hasStarted.value) {
    hasStarted.value = true
    hideFeatureCards.value = true
  }
}

const userContext = computed(() => ({
  inventoryCount: activeFoodItems.value.length,
  expiringSoon: expiringSoon.value,
  userScore: user.value.currentScore,
  totalSaved: user.value.totalSaved
}))

const sendMessage = async () => {
  if (!messageInput.value.trim() || isLoading.value) return

  hasStarted.value = true
  hideFeatureCards.value = true

  const userMessage = {
    id: Date.now().toString(),
    text: messageInput.value,
    sender: 'user',
    timestamp: new Date()
  }

  messages.value.push(userMessage)
  const currentInput = messageInput.value
  messageInput.value = ''
  scrollToBottom()

  try {
    isLoading.value = true 
    const loadingMessage = {
      id: (Date.now() + 1).toString(),
      text: 'Thinking...',
      sender: 'ai',
      timestamp: new Date(),
      isLoading: true
    }
    messages.value.push(loadingMessage)
    scrollToBottom()

    // Get AI response with user context
    const aiResponse = await generateResponse(currentInput, userContext.value)
    
    // Remove loading message and add actual response
    messages.value.pop()
    const aiMessage = {
      id: (Date.now() + 2).toString(),
      text: aiResponse,
      sender: 'ai',
      timestamp: new Date()
    }
    messages.value.push(aiMessage)
    scrollToBottom()

  } catch (err) {
    // Remove loading message and show error
    messages.value.pop()
    const errorMessage = {
      id: (Date.now() + 3).toString(),
      text: 'Sorry, I encountered an error. Please try again.',
      sender: 'ai',
      timestamp: new Date()
    }
    messages.value.push(errorMessage)
    scrollToBottom()
  } finally {
    isLoading.value = false
  }
}

function clearError() {
  if (error) error.value = null
}

const charCount = computed(() => `${messageInput.value.length}/500`)

const handleQuickQuestion = (question) => {
  messageInput.value = question
  sendMessage()
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

onMounted(() => {
  scrollToBottom()
})

// TODO: Add functions for future features:
// - Save chat history to localStorage/Firebase
// - Load previous conversations
// - Clear chat history
// - Export chat as text/PDF
// - Voice input/output integration
// - Message reactions/feedback
</script>

<template>
  <div class="chatbot-page">
    <!-- Hero Section - Full Width -->
    <div class="hero-full-width">
      <div class="compact-hero position-relative py-2 py-md-3 mb-4">
        <!-- Educational Decorative Elements -->
        <div class="position-absolute top-0 end-0 h-100 w-50 brain-decorations pe-none" style="z-index: 0;">
          <!-- Thought bubbles -->
          <div class="thought-bubble bubble-1"></div>
          <div class="thought-bubble bubble-2"></div>
          <div class="thought-bubble bubble-3"></div>
          
          <!-- Knowledge lines connecting dots -->
          <svg class="position-absolute w-100 h-100" style="top: 0; left: 0;" viewBox="0 0 400 400" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#10b981;stop-opacity:0.4" />
                <stop offset="100%" style="stop-color:#34d399;stop-opacity:0.2" />
              </linearGradient>
              <linearGradient id="lineGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#6ee7b7;stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:#10b981;stop-opacity:0.2" />
              </linearGradient>
            </defs>
            
            <!-- Connecting lines representing neural network/knowledge flow -->
            <path d="M 50,80 Q 150,120 250,100" stroke="url(#lineGradient1)" stroke-width="2" fill="none" class="knowledge-line line-1"/>
            <path d="M 80,200 Q 180,180 280,220" stroke="url(#lineGradient2)" stroke-width="2" fill="none" class="knowledge-line line-2"/>
            <path d="M 100,320 Q 200,300 300,340" stroke="url(#lineGradient1)" stroke-width="1.5" fill="none" class="knowledge-line line-3"/>
            
            <!-- Knowledge nodes -->
            <circle cx="50" cy="80" r="4" fill="#10b981" opacity="0.6" class="knowledge-node node-1"/>
            <circle cx="250" cy="100" r="4" fill="#34d399" opacity="0.6" class="knowledge-node node-2"/>
            <circle cx="80" cy="200" r="4" fill="#6ee7b7" opacity="0.6" class="knowledge-node node-3"/>
            <circle cx="280" cy="220" r="4" fill="#10b981" opacity="0.6" class="knowledge-node node-4"/>
            <circle cx="100" cy="320" r="4" fill="#34d399" opacity="0.6" class="knowledge-node node-5"/>
            <circle cx="300" cy="340" r="4" fill="#6ee7b7" opacity="0.6" class="knowledge-node node-6"/>
          </svg>
          
          <!-- Floating education icons -->
          <div class="floating-edu-icon icon-1">💡</div>
          <div class="floating-edu-icon icon-2">📚</div>
          <div class="floating-edu-icon icon-3">🎓</div>
          <div class="floating-edu-icon icon-4">🧩</div>
        </div>

        <div class="container-fluid px-3 px-md-4">
          <div class="row align-items-center g-4 position-relative">
            <!-- Left Content -->
            <div class="col-lg-6 position-relative" style="z-index: 10;">
              <div class="mb-4">
                <h1 class="display-4 fw-bold mb-3 text-dark lh-sm">
                  Chat with
                  <span class="text-success">BigBacks Brain</span>
                </h1>
                <p class="lead text-muted mb-0">
                  Smart food storage, recipes, and waste reduction powered by AI 🤖
                </p>
              </div>
            </div>

            <!-- Right Content - AI Image with Floating Emojis -->
            <div class="col-lg-6 position-relative d-none d-lg-flex justify-content-center" style="z-index: 5;">
              <div class="ai-icon-container position-relative">
                <!-- Floating Emojis around AI icon -->
                <div class="floating-emoji position-absolute fs-3" style="top: 10%; right: -10%; animation-delay: 0s;">🧠</div>
                <div class="floating-emoji position-absolute fs-4" style="top: 25%; left: -15%; animation-delay: 1s;">💬</div>
                <div class="floating-emoji position-absolute fs-5" style="bottom: 20%; left: -5%; animation-delay: 2s;">✨</div>
                <div class="floating-emoji position-absolute fs-5" style="bottom: 15%; right: -5%; animation-delay: 3s;">🤖</div>
                
                <div class="ai-circle rounded-circle shadow-lg overflow-hidden d-flex align-items-center justify-content-center">
                  <div class="ai-brain-icon">
                    <i class="bi bi-robot fs-1 text-success"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Content Wrapper -->
    <div class="content-wrapper">
      <!-- Two Column Layout -->
      <div class="row g-4">
        <!-- Left Column: Chatbot -->
        <div class="col-12 col-lg-8">
          <!-- Feature Cards (hide once chat starts) -->
          <transition name="fade-slide" appear>
            <div v-show="!hideFeatureCards && !hasStarted" id="featureCards" class="row row-cols-1 row-cols-md-2 g-3 mb-4">
              <div class="col">
                <div class="feature-card bg-gradient-blue">
                  <div class="icon-wrapper icon-gradient-blue">
                    <i class="bi bi-clock fs-5"></i>
                  </div>
                  <h5 class="text-dark">Storage Tips</h5>
                  <p class="text-secondary">Learn optimal storage methods for different foods.</p>
                  <div class="decoration"></div>
                </div>
              </div>
              <div class="col">
                <div class="feature-card bg-gradient-orange">
                  <div class="icon-wrapper icon-gradient-orange">
                    <i class="bi bi-egg-fried fs-5"></i>
                  </div>
                  <h5 class="text-dark">Recipe Ideas</h5>
                  <p class="text-secondary">Get creative recipes using leftover ingredients.</p>
                  <div class="decoration"></div>
                </div>
              </div>
              <div class="col">
                <div class="feature-card bg-gradient-purple">
                  <div class="icon-wrapper icon-gradient-purple">
                    <i class="bi bi-trash3 fs-5"></i>
                  </div>
                  <h5 class="text-dark">Waste Reduction</h5>
                  <p class="text-secondary">Tips to minimize food waste and save money.</p>
                  <div class="decoration"></div>
                </div>
              </div>
              <div class="col">
                <div class="feature-card bg-gradient-cyan">
                  <div class="icon-wrapper icon-gradient-cyan">
                    <i class="bi bi-lightbulb fs-5"></i>
                  </div>
                  <h5 class="text-dark">Smart Planning</h5>
                  <p class="text-secondary">Meal planning strategies for efficiency.</p>
                  <div class="decoration"></div>
                </div>
              </div>
            </div>
          </transition>

          <!-- Chat Shell -->
          <div class="chat-shell">
            <!-- Chat Messages -->
            <div class="chat-messages" id="chatContainer" ref="chatContainer">
              <div
                v-for="msg in messages"
                :key="msg.id"
                class="message-row"
                :class="msg.sender === 'user' ? 'is-user' : 'is-ai'"
              >
                <div class="avatar" :class="msg.sender === 'user' ? 'avatar-user' : 'avatar-ai'">
                  <i :class="msg.sender === 'user' ? 'bi bi-person-fill' : 'bi bi-robot'"></i>
                </div>

                <div class="bubble">
                  <div class="bubble-content">
                    <div class="message-text">{{ msg.text }}</div>
                  </div>
                  <div class="bubble-meta">
                    <small class="timestamp">{{ new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</small>
                  </div>
                </div>
              </div>
            </div>

            <!-- Composer -->
            <div class="chat-composer">
              <div class="quick-questions-wrapper mb-3">
                <div class="d-flex gap-2 flex-wrap justify-content-center">
                  <button
                    v-for="question in quickQuestions"
                    :key="question"
                    class="btn btn-sm btn-outline-secondary quick-btn"
                    @click="handleQuickQuestion(question)"
                    :disabled="isLoading"
                  >
                    {{ question }}
                  </button>
                </div>
              </div>

              <!-- Input Area -->
              <div class="input-area">
                <!-- Error Display -->
                <div v-if="error && error.length" class="alert alert-danger error-alert">
                  <div class="d-flex justify-content-between align-items-center">
                    <span>{{ error }}</span>
                    <button type="button" class="btn-close" @click="clearError"></button>
                  </div>
                </div>

                <div class="input-group-wrapper">
                  <div class="input-wrapper">
                    <input
                      v-model="messageInput"
                      @focus="startIfNeeded"
                      @keydown.once="startIfNeeded"
                      @keyup.enter="sendMessage"
                      type="text"
                      id="messageInput"
                      class="form-control message-input"
                      placeholder="Ask me anything..."
                      maxlength="500"
                    />
                    <i class="bi bi-stars input-icon"></i>
                  </div>
                  <button class="btn btn-send" id="sendBtn" :disabled="isLoading" @click="sendMessage">
                    <i class="bi bi-send"></i>
                  </button>
                </div>
                <div class="char-count-wrapper">
                  <small class="text-secondary" id="charCount">{{ charCount }}</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: News Vertical Carousel -->
        <div class="col-12 col-lg-4">
          <div class="news-sidebar">
            <news />
          </div>
        </div>
      </div>
    </div>
  </div>

</template>

<style scoped>
/* Main page layout */
.chatbot-page {
  min-height: 100vh;
  background: #f8f9fa;
}

/* Hero section - full width */
.hero-full-width {
  width: 100%;
  padding: 0;
  margin: 0;
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 768px) {
  .content-wrapper {
    padding: 0 2rem;
  }
}

@media (min-width: 1200px) {
  .content-wrapper {
    padding: 0 3rem;
  }
}

/* Hero Section Styles */
.compact-hero {
  position: relative;
  overflow: hidden;
  width: 100%;
}

/* AI Icon Container for positioning emojis */
.ai-icon-container {
  position: relative;
  width: 340px;
  height: 340px;
}

@media (max-width: 991px) {
  .ai-icon-container {
    width: 280px;
    height: 280px;
  }
}

/* Decorative educational elements */
.brain-decorations {
  z-index: 0;
}

/* Thought bubbles */
.thought-bubble {
  position: absolute;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(52, 211, 153, 0.08) 100%);
  border-radius: 50%;
  border: 2px solid rgba(16, 185, 129, 0.2);
}

.bubble-1 {
  width: 120px;
  height: 120px;
  top: 10%;
  right: 15%;
  animation: thoughtFloat 6s ease-in-out infinite;
}

.bubble-2 {
  width: 80px;
  height: 80px;
  top: 30%;
  right: 5%;
  animation: thoughtFloat 5s ease-in-out infinite 1s;
}

.bubble-3 {
  width: 100px;
  height: 100px;
  bottom: 20%;
  right: 20%;
  animation: thoughtFloat 7s ease-in-out infinite 2s;
}

@keyframes thoughtFloat {
  0%, 100% {
    transform: translateY(0) scale(1);
    opacity: 0.6;
  }
  50% {
    transform: translateY(-20px) scale(1.1);
    opacity: 0.8;
  }
}

/* Knowledge lines animation */
.knowledge-line {
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  animation: drawKnowledge 3s ease-in-out infinite;
}

.line-1 { animation-delay: 0s; }
.line-2 { animation-delay: 1s; }
.line-3 { animation-delay: 2s; }

@keyframes drawKnowledge {
  0%, 100% {
    stroke-dashoffset: 100;
    opacity: 0.3;
  }
  50% {
    stroke-dashoffset: 0;
    opacity: 0.6;
  }
}

/* Knowledge nodes pulse */
.knowledge-node {
  animation: nodePulse 2s ease-in-out infinite;
}

.node-1 { animation-delay: 0s; }
.node-2 { animation-delay: 0.3s; }
.node-3 { animation-delay: 0.6s; }
.node-4 { animation-delay: 0.9s; }
.node-5 { animation-delay: 1.2s; }
.node-6 { animation-delay: 1.5s; }

@keyframes nodePulse {
  0%, 100% {
    r: 4;
    opacity: 0.6;
  }
  50% {
    r: 6;
    opacity: 1;
  }
}

/* Floating education icons */
.floating-edu-icon {
  position: absolute;
  font-size: 2rem;
  animation: eduFloat 5s ease-in-out infinite;
  opacity: 0.4;
}

.icon-1 {
  top: 15%;
  right: 25%;
  animation-delay: 0s;
}

.icon-2 {
  top: 50%;
  right: 10%;
  animation-delay: 1.2s;
}

.icon-3 {
  bottom: 25%;
  right: 30%;
  animation-delay: 2.4s;
}

.icon-4 {
  bottom: 10%;
  right: 15%;
  animation-delay: 3.6s;
}

@keyframes eduFloat {
  0%, 100% {
    transform: translateY(0) rotate(-5deg);
    opacity: 0.3;
  }
  50% {
    transform: translateY(-15px) rotate(5deg);
    opacity: 0.6;
  }
}

/* Floating emojis animation */
@keyframes riseAndFloat {
  0% {
    transform: translateY(0) scale(0.6);
    opacity: 0;
  }
  20% {
    opacity: 1;
    transform: translateY(-10px) scale(1);
  }
  50% {
    transform: translateY(-20px) scale(1.1);
  }
  80% {
    opacity: 0.8;
    transform: translateY(-30px) scale(1.05);
  }
  100% {
    transform: translateY(-40px) scale(1);
    opacity: 0;
  }
}

.floating-emoji {
  animation: riseAndFloat 4s ease-in-out infinite;
  pointer-events: none;
  transform-origin: center;
}

/* AI circle */
.ai-circle {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulseGlow 3s ease-in-out infinite;
}

.ai-brain-icon {
  font-size: 8rem;
  animation: float 6s ease-in-out infinite;
}

@media (max-width: 991px) {
  .ai-brain-icon {
    font-size: 6rem;
  }
}

@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
  }
  50% {
    box-shadow: 0 0 40px rgba(16, 185, 129, 0.6);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

/* Category pills shadows */
.shadow-soft {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease-in-out;
}

.shadow-active {
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3), 0 0 4px rgba(34, 197, 94, 0.4);
  transition: all 0.25s ease-in-out;
}

.category-pills .btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Mobile responsive for hero */
@media (max-width: 991px) {
  .compact-hero {
    padding: 1rem 0 !important;
  }
  
  .display-4 {
    font-size: 2rem !important;
  }
  
  .lead {
    font-size: 1rem !important;
  }
}

@media (max-width: 575px) {
  .brain-decorations {
    z-index: 0 !important;
    pointer-events: none !important;
  }
  
  .category-pills .btn {
    position: relative;
    z-index: 30;
    font-size: 0.875rem;
    padding: 0.5rem 1rem;
  }
  
  .display-4 {
    font-size: 1.75rem !important;
  }
  
  .thought-bubble {
    opacity: 0.4;
  }
  
  .bubble-1 {
    width: 80px;
    height: 80px;
  }
  
  .bubble-2 {
    width: 50px;
    height: 50px;
  }
  
  .bubble-3 {
    width: 60px;
    height: 60px;
  }
  
  .floating-edu-icon {
    font-size: 1.2rem;
  }
  
  .icon-3,
  .icon-4 {
    display: none;
  }
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
}

.news-sidebar {
  position: sticky;
  top: 1rem;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
}

/* Vertical scrollbar for news sidebar */
.news-sidebar::-webkit-scrollbar {
  width: 6px;
}

.news-sidebar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
}

.news-sidebar::-webkit-scrollbar-thumb {
  background: rgba(16, 185, 129, 0.3);
  border-radius: 10px;
}

.news-sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(16, 185, 129, 0.5);
}

/* Feature Cards */
.feature-card {
  position: relative;
  overflow: hidden;
  border-radius: 1rem;
  padding: 1.25rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.07);
  transition: all 0.3s ease;
  cursor: pointer;
  height: 150px;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 12px rgba(0,0,0,0.1);
}

.feature-card .icon-wrapper {
  display: inline-flex;
  padding: 0.5rem;
  border-radius: 0.75rem;
  margin-bottom: 0.75rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.feature-card .decoration {
  position: absolute;
  top: 0;
  right: 0;
  width: 6rem;
  height: 6rem;
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
  transform: translate(3rem, -3rem);
}

.feature-card h5 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.feature-card p {
  font-size: 0.75rem;
  line-height: 1.4;
  margin-bottom: 0;
}

.bg-gradient-blue {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
}

.bg-gradient-orange {
  background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
}

.bg-gradient-purple {
  background: linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%);
}

.bg-gradient-cyan {
  background: linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%);
}

.icon-gradient-blue {
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  color: white;
}

.icon-gradient-orange {
  background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
  color: white;
}

.icon-gradient-purple {
  background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
  color: white;
}

.icon-gradient-cyan {
  background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%);
  color: white;
}

/* Chat Shell */
.chat-shell {
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 400px;
  max-height: 600px;
}

@media (min-width: 768px) {
  .chat-shell {
    min-height: 500px;
  }
}

/* Chat Messages */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
  padding: 1.5rem;
}

@media (max-width: 767px) {
  .chat-messages {
    padding: 1rem;
  }
}

/* Message Row */
.message-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: end;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.message-row.is-user {
  grid-template-columns: minmax(0, 1fr) 40px;
}

.message-row.is-user .avatar { 
  grid-column: 2; 
}

.message-row.is-user .bubble { 
  grid-column: 1; 
  justify-self: end; 
}

/* Avatars */
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  box-shadow: 0 4px 10px rgba(0,0,0,.08);
  flex-shrink: 0;
}

.avatar-user {
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
  color: white;
}

.avatar-ai {
  background: linear-gradient(135deg, #bbf7d0 0%, #86efac 100%);
  color: #065f46;
}

/* Bubbles */
.bubble {
  background: #DDF7E3;
  max-width: min(85%, 640px);
  color: #1f2937;
  border-radius: 14px;
  padding: 0.75rem 1rem;
  box-shadow: 0 2px 6px rgba(0,0,0,.06);
  overflow-wrap: anywhere;
}

@media (min-width: 768px) {
  .bubble {
    max-width: min(75%, 640px);
  }
}

.bubble-content { 
  line-height: 1.5; 
}

.bubble-meta { 
  margin-top: 0.25rem; 
}

.timestamp {
  font-size: 0.75rem;
  color: #6b7280;
}

/* Chat Composer */
.chat-composer {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  padding: 1rem;
  border-top: 1px solid rgba(16, 185, 129, 0.1);
}

@media (min-width: 768px) {
  .chat-composer {
    padding: 1.5rem;
  }
}

.quick-questions-wrapper {
  max-width: 100%;
  overflow-x: auto;
}

.quick-btn {
  border-color: rgba(16,185,129,0.3);
  color: #065f46;
  background: transparent;
  white-space: nowrap;
  font-size: 0.8rem;
  padding: 0.4rem 0.8rem;
}

@media (min-width: 768px) {
  .quick-btn {
    font-size: 0.875rem;
    padding: 0.5rem 1rem;
  }
}

.quick-btn:hover:not(:disabled) {
  background: rgba(16,185,129,0.1);
  border-color: rgba(16,185,129,0.5);
}

.quick-btn:disabled {
  opacity: 0.6;
}

/* Input Area */
.input-area {
  width: 100%;
}

.input-group-wrapper {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.input-wrapper {
  flex: 1;
  position: relative;
}

.message-input {
  border-radius: 2rem;
  border: 1px solid #d1d5db;
  padding: 0.875rem 3rem 0.875rem 1.25rem;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  width: 100%;
  font-size: 0.9rem;
}

@media (min-width: 768px) {
  .message-input {
    padding: 1rem 3rem 1rem 1.5rem;
    font-size: 1rem;
  }
}

.message-input:focus {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  outline: none;
}

.input-icon {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  pointer-events: none;
}

.btn-send {
  border-radius: 50%;
  width: 48px;
  height: 48px;
  padding: 0;
  border: none;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-send:hover:not(:disabled) {
  box-shadow: 0 6px 8px rgba(16, 185, 129, 0.4);
  transform: translateY(-2px);
}

.btn-send:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.char-count-wrapper {
  margin-top: 0.5rem;
  text-align: right;
  padding: 0 0.5rem;
}

.error-alert {
  border-radius: 0.75rem;
  margin-bottom: 1rem;
}

/* Transition for feature cards */
.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 320ms cubic-bezier(.2,.8,.2,1);
}

.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.fade-slide-enter-to, .fade-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
}

/* Scrollbar styling */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(16, 185, 129, 0.3);
  border-radius: 10px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: rgba(16, 185, 129, 0.5);
}
</style>
