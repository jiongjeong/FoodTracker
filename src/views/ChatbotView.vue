<script setup>
import { ref, nextTick, computed, onMounted } from 'vue'
import news from '../components/chatbot/news.vue'
import { useGeminiAI } from '../composables/useGeminiAI'


// Mock stores for now - replace with actual implementations
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

// TODO: Replace with actual user context from stores
const userContext = computed(() => ({
  inventoryCount: activeFoodItems.value.length,
  expiringSoon: expiringSoon.value,
  userScore: user.value.currentScore,
  totalSaved: user.value.totalSaved
}))

const sendMessage = async () => {
  if (!messageInput.value.trim() || isLoading.value) return

  // NEW: mark started + hide feature cards immediately
  hasStarted.value = true
  hideFeatureCards.value = true

  const userMessage = {
    id: Date.now().toString(),
    text: messageInput.value,
    sender: 'user',
    timestamp: new Date()
  }

  messages.value.push(userMessage)
  // When user adds a message, hide the feature cards with animation
  const currentInput = messageInput.value
  messageInput.value = ''
  scrollToBottom()

  try {
    isLoading.value = true 
    // Add loading message
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
    <div class="content-wrapper">
      <!-- Two Column Layout -->
      <div class="row g-4">
        <!-- Left Column: Chatbot -->
        <div class="col-12 col-lg-8">
          <!-- Header (hide once chat starts) -->
          <div v-if="!hasStarted" class="text-center mb-4">
            <h1 class="display-6 fw-bold mb-2">Welcome to 
              <span class="text-success">
                BigBacks Brain
              </span>
            </h1>
            <p class="lead text-secondary">Smart food storage, recipes, and waste reduction powered by AI</p>
          </div>

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
  background: linear-gradient(180deg, #e8f5e9 0%, #ffffff 100%);
  padding: 1rem;
}

@media (min-width: 768px) {
  .chatbot-page {
    padding: 2rem;
  }
}

@media (min-width: 1200px) {
  .chatbot-page {
    padding: 3rem;
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
