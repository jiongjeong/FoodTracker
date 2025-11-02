<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div 
        v-if="true" 
        class="modal fade show d-block" 
        tabindex="-1" 
        role="dialog"
        aria-modal="true"
        :aria-labelledby="'modal-title-' + recipe.id"
        style="z-index: 1055;"
      >
        <div 
          class="modal-backdrop fade show" 
          @click="emit('close')" 
          style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); z-index: 1050;"
        ></div>
        
        <div class="modal-dialog modal-dialog-centered modal-lg" style="position: relative; z-index: 1060; pointer-events: auto; max-width: 900px;">
          <div class="modal-content rounded-3 shadow-lg border-0">
            <div class="modal-body p-0">
              <button 
                type="button" 
                class="btn-close position-absolute top-0 end-0 m-2 bg-white rounded-circle p-2" 
                style="z-index: 10; width: 32px; height: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);" 
                @click="emit('close')"
              ></button>

              <div class="row g-0 modal-row">
                <!-- Left column: Image and Ingredients -->
                <div class="col-md-5 bg-light border-end left-col">
                  <div class="p-3 left-content">
                    <div class="image-wrapper">
                      <div class="compact-image-container">
                        <img 
                          :src="recipe.image" 
                          :alt="recipe.name" 
                          class="rounded-2 recipe-modal-img" 
                        />
                      </div>
                    </div>

                    <!-- Recipe Info -->
                    <div class="mb-2">
                      <h6 class="fw-bold mb-2" style="font-size: 0.85rem;">
                        <i class="bi bi-info-circle me-1"></i>Recipe Info
                      </h6>
                      <div class="d-flex gap-1 flex-wrap mb-2">
                        <span class="badge bg-primary rounded-pill px-2 py-1" style="font-size: 0.7rem;">{{ recipe.category }}</span>
                        <span class="badge bg-success rounded-pill px-2 py-1" style="font-size: 0.7rem;">{{ recipe.area }}</span>
                      </div>
                    </div>

                    <!-- Ingredients (separate scrollable section) -->
                    <div class="ingredients-section">
                      <h6 class="fw-bold mb-2" style="font-size: 0.85rem;">
                        <i class="bi bi-list-ul me-1"></i>Ingredients ({{ recipe.ingredients?.length || 0 }})
                      </h6>
                      <div class="ingredients-scroll">
                        <div 
                          v-for="(ingredient, idx) in recipe.ingredients" 
                          :key="idx" 
                          class="ingredient-item d-flex align-items-start py-1"
                        >
                          <i class="bi bi-dot text-primary me-2 fs-6 flex-shrink-0"></i>
                          <span class="ingredient-text">{{ ingredient }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Right column: Instructions and Actions -->
                <div class="col-md-7 right-col">
                  <div class="p-3 right-content">
                    <div class="mb-2">
                      <h3 
                        :id="'modal-title-' + recipe.id" 
                        class="fw-bold mb-1" 
                        style="font-size: 1.3rem; line-height: 1.3;"
                      >
                        {{ recipe.name }}
                      </h3>
                      <p class="text-muted mb-0" style="font-size: 0.8rem;">Follow these step-by-step instructions</p>
                    </div>

                    <!-- Instructions -->
                    <div class="instructions-section">
                      <h6 class="fw-bold mb-2" style="font-size: 0.85rem;">
                        <i class="bi bi-clipboard-check me-1"></i>Instructions
                      </h6>
                      <div class="instructions-scroll">
                        <ol class="instruction-list ps-0 mb-0">
                          <li 
                            v-for="(step, index) in formattedInstructions" 
                            :key="index" 
                            class="mb-2 instruction-step"
                          >
                            <span class="text-secondary" style="font-size: 0.85rem; line-height: 1.5;">{{ step }}</span>
                          </li>
                        </ol>
                      </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="action-buttons">
                      <button
                        @click="emit('toggle-bookmark', recipe)"
                        class="btn btn-sm flex-fill action-btn"
                        :class="isBookmarked ? 'btn-warning' : 'btn-outline-warning'"
                        style="font-size: 0.8rem; padding: 0.4rem 0.75rem;"
                      >
                        <i 
                          :class="isBookmarked ? 'bi bi-bookmark-heart-fill text-danger' : 'bi bi-bookmark-heart'" 
                          class="me-1"
                        ></i>
                        {{ isBookmarked ? 'Saved' : 'Save' }}
                      </button>
                      
                      <a 
                        v-if="recipe.video" 
                        :href="recipe.video" 
                        target="_blank" 
                        class="btn btn-outline-danger btn-sm flex-fill action-btn"
                        style="font-size: 0.8rem; padding: 0.4rem 0.75rem;"
                      >
                        <i class="bi bi-play-circle me-1"></i>Video
                      </a>
                      
                      <a 
                        v-if="recipe.source" 
                        :href="recipe.source" 
                        target="_blank" 
                        class="btn btn-outline-primary btn-sm flex-fill action-btn"
                        style="font-size: 0.8rem; padding: 0.4rem 0.75rem;"
                      >
                        <i class="bi bi-link-45deg me-1"></i>Source
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  recipe: {
    type: Object,
    required: true
  },
  isBookmarked: {
    type: Boolean,
    default: false
  },
  formattedInstructions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'toggle-bookmark'])
</script>

<style scoped>
.modal-content {
  max-height: 85vh;
  overflow: hidden;
}

.modal-body {
  height: 85vh;
  overflow: hidden;
}

.modal-row {
  height: 100%;
  display: flex;
}

.left-col {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.left-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.image-wrapper {
  flex: 0 0 auto;
  width: 100%;
  margin-bottom: 0.5rem;
}

.compact-image-container {
  width: 100%;
  padding-bottom: 60%;
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  box-sizing: border-box;
}

.recipe-modal-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ingredients-section {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.ingredients-scroll {
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
}

.ingredients-scroll::-webkit-scrollbar {
  width: 6px;
}

.ingredients-scroll::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.ingredients-scroll::-webkit-scrollbar-thumb {
  background: #059669;
  border-radius: 10px;
}

.ingredients-scroll::-webkit-scrollbar-thumb:hover {
  background: #047857;
}

.ingredient-item {
  transition: all 0.2s ease;
}

.ingredient-item:hover {
  background: rgba(5, 150, 105, 0.05);
  transform: translateX(4px);
}

.ingredient-text {
  font-size: 0.84rem;
  line-height: 1.4;
  word-break: break-word;
  white-space: normal;
}

.right-col {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.right-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.instructions-section {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.instructions-scroll {
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  padding-left: 0.8rem;
  -webkit-overflow-scrolling: touch;
}

.instructions-scroll::-webkit-scrollbar {
  width: 6px;
}

.instructions-scroll::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.instructions-scroll::-webkit-scrollbar-thumb {
  background: #059669;
  border-radius: 10px;
}

.instructions-scroll::-webkit-scrollbar-thumb:hover {
  background: #047857;
}

.instruction-list {
  list-style: none;
  counter-reset: step-counter;
  padding-left: 0;
}

.instruction-list li {
  counter-increment: step-counter;
  position: relative;
  padding-left: 3rem;
  line-height: 1.5;
}

.instruction-list li::before {
  content: counter(step-counter);
  position: absolute;
  left: 0;
  top: 0;
  background: linear-gradient(135deg, #059669 0%, #065f46 100%);
  color: white;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.75rem;
  box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3);
  transition: transform 0.2s ease;
}

.instruction-step:hover::before {
  transform: scale(1.1) rotate(5deg);
}

.action-buttons {
  flex: 0 0 auto;
  display: flex;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #dee2e6;
}

.action-btn {
  transition: all 0.2s ease;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-active .modal-dialog,
.modal-fade-leave-active .modal-dialog {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-dialog,
.modal-fade-leave-to .modal-dialog {
  transform: scale(0.9) translateY(-20px);
}

.modal-fade-enter-to .modal-dialog,
.modal-fade-leave-from .modal-dialog {
  transform: scale(1) translateY(0);
}

.modal-backdrop.fade.show {
  animation: backdropFadeIn 0.3s ease;
}

@keyframes backdropFadeIn {
  from {
    opacity: 0;
    backdrop-filter: blur(0);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(4px);
  }
}

.btn-close:hover {
  transform: rotate(90deg);
  transition: transform 0.3s ease;
}

@media (max-width: 767.98px) {
  .modal-dialog {
    margin: 0.5rem;
    max-width: calc(100% - 1rem);
  }
  
  .modal-content {
    max-height: 90vh;
  }
  
  .modal-body {
    height: 90vh;
  }
}
</style>
