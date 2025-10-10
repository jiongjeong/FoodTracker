<script setup>
import { ref, nextTick, computed, onMounted } from 'vue'
// TODO: Create and import AI service
import { useGeminiAI } from '../composables/useGeminiAI'
// TODO: Import user store when implemented
// import { useUserStore } from '../stores/user'
// TODO: Import food items store when implemented
// import { useFoodItemsStore } from '../stores/foodItems'


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
    id: '1',
    text: 'Hello! I\'m your FoodTracker AI assistant. How can I help you reduce food waste today?',
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

// TODO: Replace with actual user context from stores
const userContext = computed(() => ({
  inventoryCount: activeFoodItems.value.length,
  expiringSoon: expiringSoon.value,
  userScore: user.value.currentScore,
  totalSaved: user.value.totalSaved
}))

const sendMessage = async () => {
  if (!messageInput.value.trim() || isLoading.value) return

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
  <div class="container-fluid p-4 d-flex flex-column" style="height: calc(100vh - 80px);">
    <!-- Header Section -->
    <div class="mb-4">
      <div class="d-flex align-items-center gap-2 mb-2">
        <i class="bi bi-robot fs-3 text-primary"></i>
        <h1 class="h2 mb-0">FoodTracker AI Assistant</h1>
      </div>
      <p class="text-muted">Ask me anything about food storage, recipes, or waste reduction</p>
    </div>

    <!-- Quick Questions Section -->
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

    <!-- Chat Messages Area -->
    <div
      ref="chatContainer"
      class="glass-card flex-1 p-4 mb-3 overflow-auto"
      style="max-height: calc(100vh - 350px);"
    >
      <div
        v-for="message in messages"
        :key="message.id"
        class="d-flex mb-3"
        :class="message.sender === 'user' ? 'justify-content-end' : 'justify-content-start'"
      >
        <div
          class="chat-message"
          :class="message.sender === 'user' ? 'chat-message-user' : 'chat-message-ai'"
        >
          <!-- AI Message with Icon -->
          <div v-if="message.sender === 'ai'" class="d-flex align-items-start gap-2">
            <i class="bi bi-robot text-primary"></i>
            <div class="flex-1">
              <div v-if="message.isLoading" class="d-flex align-items-center gap-2">
                <div class="spinner-border spinner-border-sm" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                {{ message.text }}
              </div>
              <div v-else>{{ message.text }}</div>
              <!-- TODO: Add message actions (copy, regenerate, feedback) -->
            </div>
          </div>
          
          <!-- User Message -->
          <div v-else class="d-flex align-items-start gap-2">
            <div class="flex-1">{{ message.text }}</div>
            <i class="bi bi-person-fill"></i>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="messages.length === 1" class="text-center text-muted mt-5">
        <i class="bi bi-chat-dots fs-1 mb-3"></i>
        <p>Start a conversation by typing a message or selecting a quick question above.</p>
        <!-- TODO: Add sample conversation starters specific to food waste -->
      </div>
    </div>

    <!-- Message Input Area -->
    <div class="glass-card p-3">
      <!-- Error Display -->
      <div v-if="error" class="alert alert-danger alert-dismissible fade show mb-3">
        {{ error }}
        <button type="button" class="btn-close" @click="error = null"></button>
      </div>

      <!-- Input Form -->
      <form @submit.prevent="sendMessage" class="d-flex gap-2">
        <div class="input-group flex-1">
          <input
            v-model="messageInput"
            type="text"
            class="form-control"
            placeholder="Type your message about food storage, recipes, or waste reduction..."
            :disabled="isLoading"
            maxlength="500"
          />
          <!-- TODO: Add voice input button here -->
          <!-- TODO: Add file upload for food images -->
        </div>
        
        <button 
          type="submit" 
          class="btn btn-primary-gradient px-4" 
          :disabled="isLoading || !messageInput.trim()"
        >
          <div v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status">
            <span class="visually-hidden">Sending...</span>
          </div>
          <i v-else class="bi bi-send me-2"></i>
          {{ isLoading ? 'Sending...' : 'Send' }}
        </button>
      </form>

      <!-- Character Count -->
      <div class="text-end mt-2">
        <small class="text-muted">{{ messageInput.length }}/500</small>
      </div>
    </div>

    <!-- TODO: Add floating action buttons for:
         - Clear chat
         - Export conversation
         - Settings (AI model, response length, etc.)
    -->
  </div>
</template>

<style scoped>
/* Component-specific chat message styles */
.chat-message {
  max-width: 70%;
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  word-wrap: break-word;
  line-height: 1.5;
}

.chat-message-user {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: white;
  margin-left: auto;
  border-bottom-right-radius: 0.25rem;
}

.chat-message-ai {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  color: #333;
  border-bottom-left-radius: 0.25rem;
}

/* Component-specific button gradient (could be moved to global later if reused) */
.btn-primary-gradient {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  border: none;
  color: white;
  transition: all 0.2s ease;
}

.btn-primary-gradient:hover:not(:disabled) {
  background: linear-gradient(135deg, #047857 0%, #059669 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
}

.btn-primary-gradient:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Custom scrollbar for chat container only */
.overflow-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-auto::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.overflow-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* Component-specific responsive adjustments */
@media (max-width: 768px) {
  .chat-message {
    max-width: 85%;
  }
  
  .btn-primary-gradient {
    padding: 0.5rem 1rem;
  }
}

@media (max-width: 576px) {
  .btn-sm {
    font-size: 0.8rem;
    padding: 0.25rem 0.5rem;
  }
}

/* TODO: Add animations for:
   - Message appearance
   - Typing indicators
   - Loading states
   - Hover effects
*/

/* TODO: Add dark mode support:
   - Chat message colors
   - Glass card backgrounds
   - Text colors
*/
</style>