<template>
  <Teleport to="body">
    <Transition name="modal-fade" appear>
      <div v-if="true" class="modal-wrapper">
        <div class="modal-backdrop" @click="emit('close')"></div>

        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content rounded-3 shadow-lg border-0 bg-white">
            <div class="modal-body p-0">
              <button
                type="button"
                class="btn-close position-absolute top-0 end-0 m-2 bg-white rounded-circle p-2"
                style="z-index: 10; width: 32px; height: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);"
                @click="emit('close')"
              ></button>

              <!-- Mobile Title (shown only on mobile) -->
              <div class="d-md-none border-bottom bg-white p-3 pb-2">
                <h3 class="fw-bold mb-1" style="font-size: 1.2rem; line-height: 1.3;">
                  {{ recipe.name }}
                </h3>
                <div class="d-flex gap-1 mb-1">
                  <span class="badge bg-primary rounded-pill px-2 py-1" style="font-size: 0.7rem;">{{ recipe.category }}</span>
                  <span class="badge bg-success rounded-pill px-2 py-1" style="font-size: 0.7rem;">{{ recipe.area }}</span>
                </div>
              </div>

              <div class="row g-0 modal-row">
                <!-- Left column: Image and Ingredients -->
                <div class="col-md-5 bg-light border-end d-flex flex-column overflow-hidden mobile-col">
                  <div class="p-3 d-flex flex-column overflow-hidden content-wrapper">
                    <div class="flex-shrink-0 mb-2">
                      <div class="compact-image-container">
                        <img
                          :src="recipe.image"
                          :alt="recipe.name"
                          class="rounded-2 recipe-modal-img"
                        />
                      </div>
                    </div>

                    <!-- Recipe Info -->
                    <div class="mb-2 flex-shrink-0">
                      <h6 class="fw-bold mb-2" style="font-size: 0.85rem;">
                        <i class="bi bi-info-circle me-1"></i>Recipe Info
                      </h6>
                      <div class="d-flex gap-1 flex-wrap mb-2">
                        <span class="badge bg-primary rounded-pill px-2 py-1" style="font-size: 0.7rem;">{{ recipe.category }}</span>
                        <span class="badge bg-success rounded-pill px-2 py-1" style="font-size: 0.7rem;">{{ recipe.area }}</span>
                      </div>
                    </div>

                    <!-- Ingredients (separate scrollable section) -->
                    <div class="flex-fill d-flex flex-column overflow-hidden">
                      <h6 class="fw-bold mb-2 flex-shrink-0" style="font-size: 0.85rem;">
                        <i class="bi bi-list-ul me-1"></i>Ingredients ({{ recipe.ingredients?.length || 0 }})
                      </h6>
                      <div class="flex-fill overflow-auto custom-scrollbar ingredients-list">
                        <div
                          v-for="(ingredient, idx) in recipe.ingredients"
                          :key="idx"
                          class="ingredient-item d-flex align-items-start py-1"
                        >
                          <i class="bi bi-dot text-primary me-2 fs-6 flex-shrink-0"></i>
                          <span class="small">{{ ingredient }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Right column: Instructions and Actions -->
                <div class="col-md-7 d-flex flex-column overflow-hidden mobile-col">
                  <div class="p-3 d-flex flex-column overflow-hidden content-wrapper">
                    <!-- Desktop Title (hidden on mobile) -->
                    <div class="mb-2 flex-shrink-0 d-none d-md-block">
                      <h3
                        :id="'modal-title-' + recipe.id"
                        class="fw-bold mb-1"
                        style="font-size: 1.3rem; line-height: 1.3;"
                      >
                        {{ recipe.name }}
                      </h3>
                      <p class="text-muted mb-0 small">Follow these step-by-step instructions</p>
                    </div>

                    <!-- Instructions -->
                    <div class="flex-fill d-flex flex-column overflow-hidden mb-2">
                      <h6 class="fw-bold mb-2 flex-shrink-0" style="font-size: 0.85rem;">
                        <i class="bi bi-clipboard-check me-1"></i>Instructions
                      </h6>
                      <div class="flex-fill overflow-auto custom-scrollbar ps-2">
                        <ol class="instruction-list list-unstyled ps-0 mb-0">
                          <li
                            v-for="(step, index) in formattedInstructions"
                            :key="index"
                            class="mb-2 instruction-step"
                          >
                            <span class="text-secondary small lh-base">{{ step }}</span>
                          </li>
                        </ol>
                      </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="d-flex gap-2 pt-2 border-top flex-shrink-0">
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
/* Modal sizing */
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
}

/* Desktop: columns have fixed height */
@media (min-width: 768px) {
  .mobile-col {
    height: 100%;
  }

  .content-wrapper {
    height: 100%;
  }
}

/* Image container with aspect ratio */
.compact-image-container {
  width: 100%;
  padding-bottom: 60%;
  position: relative;
  overflow: hidden;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
}

.recipe-modal-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Custom scrollbar for ingredients and instructions */
.custom-scrollbar {
  -webkit-overflow-scrolling: touch;
  overflow-x: hidden;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 0; /* Hide horizontal scrollbar */
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #059669;
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #047857;
}

/* Ingredient item hover effect */
.ingredient-item {
  transition: all 0.2s ease;
}

.ingredient-item:hover {
  background: rgba(5, 150, 105, 0.05);
  transform: translateX(4px);
}

/* Numbered instruction steps */
.instruction-list {
  counter-reset: step-counter;
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

/* Action button hover effect */
.action-btn {
  transition: all 0.2s ease;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* Modal wrapper and backdrop */
.modal-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1055;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.75rem;
}

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: -1;
}

.modal-dialog {
  position: relative;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  z-index: 1;
}

/* Transition animations */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-active .modal-backdrop,
.modal-fade-leave-active .modal-backdrop {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-active .modal-dialog,
.modal-fade-leave-active .modal-dialog {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-fade-enter-from {
  opacity: 0;
}

.modal-fade-enter-from .modal-backdrop {
  opacity: 0;
}

.modal-fade-enter-from .modal-dialog {
  transform: scale(0.95) translateY(-10px);
  opacity: 0;
}

.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-leave-to .modal-backdrop {
  opacity: 0;
}

.modal-fade-leave-to .modal-dialog {
  transform: scale(0.98);
  opacity: 0;
}

.modal-fade-enter-to,
.modal-fade-leave-from {
  opacity: 1;
}

/* Close button animation */
.btn-close:hover {
  transform: rotate(90deg);
  transition: transform 0.3s ease;
}

/* Mobile responsive */
@media (max-width: 767.98px) {
  .modal-wrapper {
    padding: 0.5rem;
  }

  .modal-content {
    max-height: 90vh;
    height: auto;
  }

  .modal-body {
    height: auto;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-row {
    height: auto;
  }

  /* Remove border on mobile since columns stack */
  .mobile-col {
    border-right: none !important;
    height: auto;
  }

  .content-wrapper {
    height: auto;
  }

  /* Remove internal scrolling on mobile, use main modal scroll */
  .custom-scrollbar {
    overflow: visible;
    overflow-x: hidden;
    height: auto;
  }

  /* Column layout for ingredients on mobile - prevent horizontal overflow */
  .ingredients-list {
    column-count: 2;
    column-gap: 0.75rem;
    overflow-x: hidden !important;
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
  }

  /* Ensure ingredient items wrap properly within columns */
  .ingredient-item {
    break-inside: avoid;
    page-break-inside: avoid;
    display: flex !important;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  /* Force text wrapping on ingredient text */
  .ingredient-item .small {
    word-break: break-word;
    overflow-wrap: break-word;
    white-space: normal;
    max-width: calc(100% - 1.5rem); /* Account for icon width */
    flex: 1;
  }

  /* Ensure icon doesn't cause overflow */
  .ingredient-item .bi-dot {
    flex-shrink: 0;
  }

  /* Compact image on mobile */
  .compact-image-container {
    padding-bottom: 50%;
  }
}
</style>
