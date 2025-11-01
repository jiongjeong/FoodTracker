<script setup>
import { ref, nextTick, computed, onMounted } from 'vue'

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
 <div class="container-fluid p-5" style="background: linear-gradient(180deg, #e8f5e9 0%, #ffffff 100%);">
    <!-- Header (hide once chat starts) -->
    <div v-if="!hasStarted" class="text-center mb-5">
      <h1 class="display-6 fw-bold mb-2">Welcome to FoodTracker AI</h1>
      <p class="lead text-secondary">Smart food storage, recipes, and waste reduction powered by AI</p>
    </div>

      <!-- Feature Cards (hide once chat starts) -->
      <transition name="fade-slide" appear>
        <div id="featureCards" v-show="!hideFeatureCards && !hasStarted" class="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-3 mb-4">
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

    <!-- Chat Shell: messages scroll; composer stays fixed at bottom -->
    <div class="chat-shell">
      <!-- Chat Messages -->
      <div class="chat-messages p-4" id="chatContainer" ref="chatContainer">
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

      <!-- Quick Prompts (unchanged placement) -->
      <div id="quickPromptsSection" class="px-4 py-3">
        <div class="d-flex flex-wrap gap-2 justify-content-center" id="quickPrompts">
          <!-- Quick prompts will be added here dynamically -->
        </div>
      </div>

      <!-- Composer -->
      <div class="chat-container px-3">
        <div class="mb-3">
          <div class="d-flex gap-2 flex-wrap">
            <button
              v-for="question in quickQuestions"
              :key="question"
              class="btn btn-sm btn-outline-secondary"
              @click="handleQuickQuestion(question)"
              :disabled="isLoading"
            >
              {{ question }}
            </button>
          </div>
        </div>
        <!-- Input Area -->
        <div class="input-area p-2">
          <!-- Error Display -->
          <div v-if="error && error.length" class="alert alert-danger error-alert">
            <div class="d-flex justify-content-between align-items-center">
              <span>{{ error }}</span>
              <button type="button" class="btn-close" @click="clearError"></button>
            </div>
          </div>

          <div class="d-flex gap-3 align-items-center">
            <div class="flex-grow-1 position-relative">
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
              <i class="bi bi-stars position-absolute text-secondary" style="right: 1rem; top: 50%; transform: translateY(-50%);"></i>
            </div>
            <button class="btn btn-send btn-success text-white" id="sendBtn" :disabled="isLoading" @click="sendMessage">
              <i class="bi bi-send"></i>
            </button>
          </div>
          <div class="d-flex justify-content-between align-items-center mt-3 px-2">
            <small class="text-secondary" id="charCount">{{ charCount }}</small>
          </div>
        </div>
      </div>
    </div>
  </div>

</template>

<style scoped>
/* Component-specific chat message styles */
body {
  background:  linear-gradient(180deg, #e8f5e9 0%, #ffffff 100%);
}
html, body {
  height: 100%;
  margin: 0;
  overflow: hidden; /* Prevent full-page scroll */
}

/* Outer container fills screen */
.container-fluid {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* NEW: Chat shell manages layout so messages scroll and composer stays visible */
.chat-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0; /* critical for overflow children */
}

/* Ensure messages flex to fill and scroll inside (override fixed heights below) */
.chat-messages {
  flex: 1 1 auto;
  height: auto !important;
  max-height: none !important;
  overflow-y: auto;
  scroll-behavior: smooth;
}

/* Keep composer pinned at bottom (use your existing styles/colors) */
.chat-container {
  position: sticky;
  bottom: 0;
  z-index: 5;
}

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

     :root {
  --emerald-600:#10b981;
  --emerald-500:#34d399;
  --ai-bubble:#f3f4f6;
  --text-dark:#1f2937;
  --text-muted:#6b7280;
}

/* Unified message row with mirrored alignment */
.message-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: end;
  gap: .75rem;
  margin-bottom: .75rem;
}

.message-row.is-user {
  grid-template-columns: minmax(0, 1fr) 40px;
}
.message-row.is-user .avatar { grid-column: 2; }
.message-row.is-user .bubble { grid-column: 1; justify-self: end; }

/* Avatars (consistent size + centering) */
.avatar {
  width: 40px; height: 40px; border-radius: 999px;
  display: grid; place-items: center;
  box-shadow: 0 4px 10px rgba(0,0,0,.08);
  flex-shrink: 0;
}
.avatar-user {
  background: linear-gradient(135deg, var(--indigo-500), var(--indigo-600));
  color: #fff;
}
.avatar-ai {
  background: linear-gradient(135deg, var(--emerald-500), var(--emerald-600));
  color: #053c2b;
}

/* Bubbles */
.bubble {
  background: #DDF7E3;
  max-width: min(75%, 640px);
  color: var(--text-dark);
  border-radius: 14px;
  padding: .75rem 1rem;
  position: relative;
  box-shadow: 0 2px 6px rgba(0,0,0,.06);
  overflow-wrap: anywhere; /* handles long words/URLs */
}


/* Subtle tails */
.bubble::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: -6px;
  width: 10px; height: 10px;
  background: var(--ai-bubble);
  transform: translateY(0) rotate(45deg);
  border-bottom-left-radius: 2px;
  box-shadow: -2px 2px 3px rgba(0,0,0,.03);
}
.message-row.is-user .bubble::after {
  right: -6px; left: auto;
  background: linear-gradient(135deg, var(--indigo-500), var(--indigo-600));
  box-shadow: 2px 2px 3px rgba(0,0,0,.06);
}

/* Bubble content + meta */
.bubble-content { line-height: 1.5; }
.bubble-meta { margin-top: .25rem; }

/* You had two .chat-messages height rules; overrides above take precedence */
.chat-messages {
  height: 420px;
  overflow-y: auto;
  scroll-behavior: smooth;
  padding-bottom: .25rem;
}

/* Optional: nicer selection in bubbles */
.bubble ::selection {
  background: rgba(16,185,129,.18);
}


    .chat-messages {
      height: 400px;
      overflow-y: auto;
      scroll-behavior: smooth;
    }

    .btn-send:disabled { opacity: 0.6 }
    .avatar-user {
      background: linear-gradient(135deg,#34d399 0%, #10b981 100%);
      color: white;
    }

    .avatar-ai {
      background: linear-gradient(135deg,#bbf7d0 0%, #86efac 100%);
      color: #065f46;
    }

    .btn-outline-secondary[disabled], .btn-outline-secondary:disabled {
      opacity: 0.9;
    }

    /* Quick prompts use emerald outline */
    .btn-outline-secondary {
      border-color: rgba(16,185,129,0.18);
      color: #065f46;
      background: transparent;
    }

    /* Transition for feature cards: fade + slide up */
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

    .message-bubble {
      max-width: 70%;
      padding: 1rem 1.5rem;
      border-radius: 1.25rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .message-user .message-bubble {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
    }

    .message-ai .message-bubble {
      background: #f3f4f6;
      color: #1f2937;
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      flex-shrink: 0;
    }

    .avatar-user {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
    }

    .avatar-ai {
      background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
      color: white;
    }

    .input-area {
      background: #f3f4f6;
      border-radius: 2rem;
    }

    .message-input {
      border-radius: 2rem;
      border: 1px solid #d1d5db;
      padding: 1rem 1.5rem;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    .message-input:focus {
      border-color: #21d078;
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
      outline: none;
    }

    .btn-send {
      border-radius: 2rem;
      padding: 1rem 1.5rem;
      border: none;
      box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3);
      transition: all 0.2s;
    }

    .btn-send:hover:not(:disabled) {
      box-shadow: 0 6px 8px rgba(139, 92, 246, 0.4);
      transform: translateY(-1px);
    }

    .btn-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .quick-prompt {
      border-radius: 2rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      color: #374151;
      transition: all 0.2s;
    }

    .quick-prompt:hover:not(:disabled) {
      background: #e5e7eb;
    }

    .quick-prompt:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .loading-dots {
      display: flex;
      gap: 0.25rem;
    }

    .loading-dot {
      width: 0.5rem;
      height: 0.5rem;
      background: #9ca3af;
      border-radius: 50%;
      animation: bounce 0.6s infinite;
    }

    .loading-dot:nth-child(2) {
      animation-delay: 0.1s;
    }

    .loading-dot:nth-child(3) {
      animation-delay: 0.2s;
    }

    @keyframes bounce {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-5px);
      }
    }


    .error-alert {
      border-radius: 0.75rem;
      margin-bottom: 1rem;
    }

</style>
