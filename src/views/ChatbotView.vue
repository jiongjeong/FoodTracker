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

    const aiResponse = await generateResponse(currentInput, userContext.value)
    
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

</script>

<template>
  <div class="chatbot-page">  
    <div class="hero-full-width">
      <div class="compact-hero position-relative py-4 py-md-5 mb-4">
        <div class="color-splashes position-absolute w-100 h-100" style="z-index: 1;">
          <div class="color-splash splash-1"></div>
          <div class="color-splash splash-2"></div>
          <div class="color-splash splash-3"></div>
          <div class="color-splash splash-4"></div>
          <div class="color-splash splash-5"></div>
        </div>
        

        <div class="position-absolute top-0 end-0 h-100 w-50 brain-decorations pe-none" style="z-index: 0;">
          <!-- speech bubbles -->
          <div class="speech-bubble bubble-1">
            <div class="bubble-text">💬</div>
            <div class="bubble-tail"></div>
          </div>
          <div class="speech-bubble bubble-2">
            <div class="bubble-text">💭</div>
            <div class="bubble-tail tail-left"></div>
          </div>
          <div class="speech-bubble bubble-3">
            <div class="bubble-text">🗨️</div>
            <div class="bubble-tail"></div>
          </div>
          <div class="speech-bubble bubble-4">
            <div class="bubble-text">💬</div>
            <div class="bubble-tail tail-left"></div>
          </div>
          
          <svg class="position-absolute w-100 h-100" style="top: 0; left: 0;" viewBox="0 0 400 400" preserveAspectRatio="none">
            <defs>
              <linearGradient id="conversationGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#10b981;stop-opacity:0.15" />
                <stop offset="100%" style="stop-color:#34d399;stop-opacity:0.05" />
              </linearGradient>
            </defs>

            <path d="M 100,100 Q 150,150 200,180" stroke="url(#conversationGradient)" stroke-width="1.5" fill="none" class="conversation-line line-1" stroke-dasharray="5,5"/>
            <path d="M 200,180 Q 250,220 280,260" stroke="url(#conversationGradient)" stroke-width="1.5" fill="none" class="conversation-line line-2" stroke-dasharray="5,5"/>
          </svg>
        </div>

        <div class="container-fluid px-3 px-md-4">
          <div class="row align-items-center g-4 position-relative">
            <div class="col-lg-6 position-relative" style="z-index: 10;">
              <div class="mb-4">
                <h1 class="display-4 fw-bold mb-3 text-dark lh-sm">
                  <span class="text-success">BigBacks Brain</span>
                </h1>
                <p class="lead text-muted mb-3">
                  Smart Food AI & Latest Food News 🤖
                </p>
                
                <div class="feature-pills d-flex flex-wrap gap-2">
                  <span class="feature-pill">Storage Tips</span>
                  <span class="feature-pill">Recipe Ideas</span>
                  <span class="feature-pill">Waste Reduction</span>
                  <span class="feature-pill">Smart Planning</span>
                </div>
              </div>
            </div>

            <div class="col-lg-6 position-relative d-none d-lg-flex justify-content-center align-items-center" style="z-index: 5;">
              <div class="speech-bubbles-container position-relative">
                <div class="chat-bubble bubble-main-1">
                  <div class="bubble-content">
                    <p class="mb-0">Hey! Need help with your food?</p>
                  </div>
                  <div class="bubble-tail-bottom"></div>
                </div>
                
                <div class="chat-bubble bubble-main-2">
                  <div class="bubble-content">
                    <p class="mb-0">I can help you reduce waste! 🌱</p>
                  </div>
                  <div class="bubble-tail-top"></div>
                </div>
                
                <div class="chat-bubble bubble-main-3">
                  <div class="bubble-content">
                    <p class="mb-0">Ask me anything about storage!</p>
                  </div>
                  <div class="bubble-tail-bottom"></div>
                </div>
                <div class="thought-bubble-small thought-1">💭</div>
                <div class="thought-bubble-small thought-2">💡</div>
                <div class="thought-bubble-small thought-3">🤖</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="container-fluid px-3 px-md-4" style="max-width: 1400px; margin: 0 auto;">
      <div class="row g-4">
        <!-- left col: chatbot -->
        <div class="col-12 col-lg-8 px-xxl-0 mx-0">
          <div class="chat-shell">
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

              <div class="input-area">
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

        <!-- right col: news section -->
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
.chatbot-page {
  min-height: 100vh;
  background: #f8f9fa;
}

.hero-full-width {
  width: 100%;
  padding: 0;
  margin: 0;
  background: transparent;
}

.content-wrapper {
  min-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
}

@media (min-width: 768px) {
  .content-wrapper {
    padding: 0 2rem;
  }
}

@media (min-width: 1200px) {
  .content-wrapper {
    padding: 0 24px;
  }
}

.compact-hero {
  position: relative;
  overflow: hidden;
  width: 100%;
}

.color-splashes {
  top: 0;
  left: 0;
  pointer-events: none;
  overflow: hidden;
}

.color-splash {
  position: absolute;
  border-radius: 50%;
  filter: blur(25px);
  opacity: 0.35;
  animation: floatGentle 8s ease-in-out infinite;
  pointer-events: none;
}

.splash-1 {
  width: 180px;
  height: 180px;
  background: linear-gradient(135deg, #10b981, #34d399);
  top: 10%;
  left: 5%;
  animation-delay: 0s;
}

.splash-2 {
  width: 120px;
  height: 120px;
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
  top: 60%;
  right: 15%;
  animation-delay: -2s;
}

.splash-3 {
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, #8b5cf6, #a78bfa);
  top: 30%;
  left: 50%;
  animation-delay: -4s;
}

.splash-4 {
  width: 90px;
  height: 90px;
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
  top: 80%;
  left: 20%;
  animation-delay: -6s;
}

.splash-5 {
  width: 150px;
  height: 150px;
  background: linear-gradient(135deg, #ef4444, #fb7185);
  top: 15%;
  right: 35%;
  animation-delay: -3s;
}

@keyframes floatGentle {
  0%, 100% {
    transform: translateY(0px) translateX(0px);
  }
  25% {
    transform: translateY(-8px) translateX(4px);
  }
  50% {
    transform: translateY(-4px) translateX(-6px);
  }
  75% {
    transform: translateY(-12px) translateX(2px);
  }
}

/* Mobile responsive for color splashes */
@media (max-width: 768px) {
  .color-splash {
    filter: blur(25px);
    opacity: 0.1;
  }
  
  .splash-1 { width: 120px; height: 120px; }
  .splash-2 { width: 80px; height: 80px; }
  .splash-3 { width: 130px; height: 130px; }
  .splash-4 { width: 60px; height: 60px; }
  .splash-5 { width: 100px; height: 100px; }
}


.speech-bubbles-container {
  position: relative;
  width: 400px;
  height: 350px;
}

@media (max-width: 991px) {
  .speech-bubbles-container {
    width: 320px;
    height: 280px;
  }
}


.speech-bubbles-container {
  position: relative;
  width: 400px;
  height: 350px;
}

@media (max-width: 991px) {
  .speech-bubbles-container {
    width: 320px;
    height: 280px;
  }
}

.chat-bubble {
  position: absolute;
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
  border: 2px solid #10b981;
  border-radius: 20px;
  padding: 16px 20px;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
  max-width: 250px;
  animation: bubbleAppear 1s ease-out forwards;
  opacity: 0;
}

.chat-bubble p {
  font-size: 0.95rem;
  color: #065f46;
  font-weight: 500;
  line-height: 1.4;
}

.bubble-main-1 {
  top: 20%;
  left: 10%;
  animation-delay: 0.5s;
}

.bubble-main-2 {
  top: 45%;
  right: 5%;
  animation-delay: 1.5s;
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border-color: #34d399;
}

.bubble-main-3 {
  bottom: 15%;
  left: 15%;
  animation-delay: 2.5s;
}

.bubble-tail-bottom {
  position: absolute;
  bottom: -12px;
  left: 30px;
  width: 0;
  height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-top: 12px solid #10b981;
}

.bubble-tail-bottom::after {
  content: '';
  position: absolute;
  bottom: 2px;
  left: -10px;
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid #ffffff;
}

.bubble-tail-top {
  position: absolute;
  top: -12px;
  right: 30px;
  width: 0;
  height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-bottom: 12px solid #34d399;
}

.bubble-tail-top::after {
  content: '';
  position: absolute;
  top: 2px;
  left: -10px;
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 10px solid #dcfce7;
}

.thought-bubble-small {
  position: absolute;
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border: 2px solid #6ee7b7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
  animation: thoughtFloat 4s ease-in-out infinite;
}

.thought-1 {
  top: 10%;
  right: 15%;
  animation-delay: 0s;
}

.thought-2 {
  top: 60%;
  left: 5%;
  animation-delay: 1.5s;
}

.thought-3 {
  bottom: 10%;
  right: 20%;
  animation-delay: 3s;
}

@keyframes bubbleAppear {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(10px);
  }
  60% {
    opacity: 1;
    transform: scale(1.05) translateY(0);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes thoughtFloat {
  0%, 100% {
    transform: translateY(0);
    opacity: 0.7;
  }
  50% {
    transform: translateY(-15px);
    opacity: 1;
  }
}

/* Feature Pills */
.feature-pills {
  margin-top: 1rem;
}

.feature-pill {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #065f46;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.feature-pill:hover {
  background: rgba(255, 255, 255, 0.6);
  border-color: rgba(16, 185, 129, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
}

.brain-decorations {
  z-index: 0;
}

.speech-bubble {
  position: absolute;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(52, 211, 153, 0.04) 100%);
  border-radius: 15px;
  border: 1.5px solid rgba(16, 185, 129, 0.15);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(5px);
}

.bubble-text {
  font-size: 1.5rem;
  line-height: 1;
}

.bubble-tail {
  position: absolute;
  bottom: -8px;
  right: 20px;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid rgba(16, 185, 129, 0.08);
}

.bubble-tail::after {
  content: '';
  position: absolute;
  bottom: 1px;
  right: -7px;
  width: 0;
  height: 0;
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-top: 7px solid rgba(16, 185, 129, 0.08);
}

.tail-left {
  right: auto;
  left: 20px;
}

.bubble-1 {
  width: 60px;
  height: 60px;
  top: 15%;
  right: 20%;
  animation: subtleBubbleFloat 8s ease-in-out infinite;
}

.bubble-2 {
  width: 55px;
  height: 55px;
  top: 35%;
  right: 8%;
  animation: subtleBubbleFloat 7s ease-in-out infinite 1s;
}

.bubble-3 {
  width: 58px;
  height: 58px;
  bottom: 30%;
  right: 25%;
  animation: subtleBubbleFloat 9s ease-in-out infinite 2s;
}

.bubble-4 {
  width: 52px;
  height: 52px;
  bottom: 15%;
  right: 10%;
  animation: subtleBubbleFloat 7.5s ease-in-out infinite 3s;
}

@keyframes subtleBubbleFloat {
  0%, 100% {
    transform: translateY(0) translateX(0);
    opacity: 0.4;
  }
  25% {
    transform: translateY(-8px) translateX(3px);
    opacity: 0.5;
  }
  50% {
    transform: translateY(-5px) translateX(-3px);
    opacity: 0.6;
  }
  75% {
    transform: translateY(-10px) translateX(2px);
    opacity: 0.5;
  }
}

.conversation-line {
  stroke-dasharray: 5, 5;
  animation: dashFlow 20s linear infinite;
  opacity: 0.3;
}

.line-1 { animation-delay: 0s; }
.line-2 { animation-delay: 2s; }

@keyframes dashFlow {
  to {
    stroke-dashoffset: -100;
  }
}

/* floating emojis */
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
  
  .feature-pill {
    font-size: 0.75rem;
    padding: 0.4rem 0.8rem;
  }
  
  .speech-bubble {
    opacity: 0.5;
  }
  
  .bubble-1 {
    width: 45px;
    height: 45px;
  }
  
  .bubble-2 {
    width: 40px;
    height: 40px;
  }
  
  .bubble-3 {
    width: 42px;
    height: 42px;
  }
  
  .bubble-4 {
    width: 38px;
    height: 38px;
  }
  
  .bubble-text {
    font-size: 1rem;
  }
  
  .conversation-line {
    opacity: 0.15;
  }
}

.news-sidebar {
  position: sticky;
  top: 1rem;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
}

/* scrollbar for news sidebar */
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
