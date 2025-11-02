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

<template>
  <div class="modal fade show d-block" tabindex="-1" style="z-index: 1055;">
    <div 
      class="modal-backdrop fade show" 
      @click="emit('close')" 
      style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); z-index: 1050;"
    ></div>
    
    <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable" style="position: relative; z-index: 1060; pointer-events: auto;">
      <div class="modal-content rounded-4 shadow-lg border-0">
        <div class="modal-body p-0">
          <button 
            type="button" 
            class="btn-close position-absolute top-0 end-0 m-3" 
            style="z-index: 10;" 
            @click="emit('close')"
          ></button>

          <div class="row g-0">
            <!-- Left column: Image and Ingredients -->
            <div class="col-md-5 bg-light border-end">
              <div class="p-4">
                <img 
                  :src="recipe.image" 
                  :alt="recipe.name" 
                  class="img-fluid rounded-3 mb-3 w-100" 
                  style="aspect-ratio: 1; object-fit: cover;" 
                />

                <!-- Recipe Info -->
                <div class="mb-3">
                  <h6 class="fw-bold mb-2">
                    <i class="bi bi-info-circle me-2"></i>Recipe Info
                  </h6>
                  <div class="d-flex gap-2 flex-wrap mb-2">
                    <span class="badge bg-primary rounded-pill">{{ recipe.category }}</span>
                    <span class="badge bg-success rounded-pill">{{ recipe.area }}</span>
                  </div>
                </div>

                <!-- Ingredients -->
                <div>
                  <h6 class="fw-bold mb-2">
                    <i class="bi bi-list-ul me-2"></i>Ingredients
                  </h6>
                  <div class="overflow-auto" style="max-height: 250px;">
                    <div 
                      v-for="(ingredient, idx) in recipe.ingredients" 
                      :key="idx" 
                      class="d-flex align-items-center mb-2"
                    >
                      <i class="bi bi-dot text-primary me-2 fs-4"></i>
                      <span class="small">{{ ingredient }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right column: Instructions and Actions -->
            <div class="col-md-7 d-flex flex-column">
              <div class="p-4 d-flex flex-column h-100">
                <div class="mb-3">
                  <h3 class="fw-bold">{{ recipe.name }}</h3>
                  <p class="text-muted mb-0">Follow these step-by-step instructions</p>
                </div>

                <!-- Instructions -->
                <div class="flex-grow-1 mb-3 overflow-hidden d-flex flex-column">
                  <h6 class="fw-bold mb-3">
                    <i class="bi bi-clipboard-check me-2"></i>Instructions
                  </h6>
                  <div class="overflow-auto flex-grow-1" style="max-height: 450px;">
                    <ol class="instruction-list ps-3 mb-0">
                      <li 
                        v-for="(step, index) in formattedInstructions" 
                        :key="index" 
                        class="mb-3"
                      >
                        <span class="text-secondary">{{ step }}</span>
                      </li>
                    </ol>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="d-flex gap-2 mt-auto pt-3">
                  <button
                    @click="emit('toggle-bookmark', recipe)"
                    class="btn btn-sm flex-fill"
                    :class="isBookmarked ? 'btn-warning' : 'btn-outline-warning'"
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
                    class="btn btn-outline-danger btn-sm flex-fill"
                  >
                    <i class="bi bi-play-circle me-1"></i>Video
                  </a>
                  
                  <a 
                    v-if="recipe.source" 
                    :href="recipe.source" 
                    target="_blank" 
                    class="btn btn-outline-primary btn-sm flex-fill"
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
</template>

<style scoped>
.instruction-list {
  list-style: none;
  counter-reset: step-counter;
  padding-left: 0;
}

.instruction-list li {
  counter-increment: step-counter;
  position: relative;
  padding-left: 3rem;
  line-height: 1.6;
}

.instruction-list li::before {
  content: counter(step-counter);
  position: absolute;
  left: 0;
  top: 0;
  background: linear-gradient(135deg, #059669 0%, #065f46 100%);
  color: white;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
  box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3);
}

@media (max-width: 767.98px) {
  .modal-dialog {
    margin: 0.5rem;
  }
}
</style>
