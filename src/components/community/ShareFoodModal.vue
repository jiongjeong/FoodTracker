<script setup>
import { ref, watch, computed } from 'vue'
import LocationPicker from '@/components/LocationPicker.vue'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  formData: {
    type: Object,
    required: true
  },
  foodItems: {
    type: Array,
    required: true
  },
  maxShareQuantity: {
    type: Number,
    default: 0
  },
  isShareQuantityValid: {
    type: Boolean,
    default: false
  },
  isEditMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'submit', 'select-food', 'location-selected'])

// Local form state
const localForm = ref({
  foodItemId: '',
  foodName: '',
  category: '',
  quantity: '',
  expirationDate: '',
  pickupTime: '',
  notes: '',
  unit: '',
  location: null
})

// Watch for changes to formData and update localForm
watch(() => props.formData, (newVal) => {
  console.log('ShareFoodModal: formData changed', newVal)
  // Update each property individually to maintain reactivity
  Object.keys(newVal).forEach(key => {
    if (localForm.value[key] !== newVal[key]) {
      console.log(`Updating ${key} from`, localForm.value[key], 'to', newVal[key])
      localForm.value[key] = newVal[key]
    }
  })
}, { deep: true, immediate: true })

// Handle close
const handleClose = () => {
  emit('close')
}

// Handle submit
const handleSubmit = () => {
  emit('submit', localForm.value)
}

// Handle food selection
const handleFoodSelect = () => {
  // Emit the selected ID and let parent update shareForm
  // Then the watch will sync those changes back to localForm
  emit('select-food', localForm.value.foodItemId)
}

// Handle location selection
const handleLocationSelect = (location) => {
  emit('location-selected', location)
}

// Check if quantity exceeds max
const quantityExceeded = computed(() => {
  return localForm.value.quantity > props.maxShareQuantity
})
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-backdrop" @click.self="handleClose">
      <Transition name="modal-slide">
        <div v-if="show" class="modal-card">
          <!-- Header with gradient -->
          <div class="modal-header">
            <div class="d-flex align-items-center gap-2">
              <div class="modal-icon">
                <i :class="isEditMode ? 'bi bi-pencil-fill' : 'bi bi-share-fill'"></i>
              </div>
              <h3 class="modal-title mb-0">{{ isEditMode ? 'Edit Donation' : 'Share Food Item' }}</h3>
            </div>
            <button class="btn-close-custom" @click="handleClose" aria-label="Close">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <!-- Food Selection - Create Mode -->
            <div v-if="!isEditMode" class="form-group">
              <label class="form-label">
                <i class="bi bi-egg-fill me-1"></i>
                Food Name
                <span class="text-danger">*</span>
              </label>
              <select
                v-model="localForm.foodItemId"
                class="form-select"
                @change="handleFoodSelect"
                required
              >
                <option value="" disabled>Select a food item...</option>
                <option
                  v-for="item in foodItems"
                  :key="item.id"
                  :value="item.id"
                  :disabled="item.remainingQty <= 0 || item.isExpired"
                >
                  {{ item.name }} - {{ item.remainingQty }} {{ item.unit }} left
                  <template v-if="item.isExpired"> (expired)</template>
                </option>
              </select>
            </div>

            <!-- Food Selection - Edit Mode (Read-only) -->
            <div v-else class="form-group">
              <label class="form-label">
                <i class="bi bi-egg-fill me-1"></i>
                Food Name
              </label>
              <input
                v-model="localForm.foodName"
                type="text"
                class="form-control"
                readonly
                disabled
              />
            </div>

            <!-- Category and Expiration Row -->
            <div class="row g-3">
              <div class="col-6">
                <label class="form-label">
                  <i class="bi bi-bookmark-fill me-1"></i>
                  Category
                </label>
                <input
                  v-model="localForm.category"
                  type="text"
                  class="form-control"
                  readonly
                  disabled
                />
              </div>
              <div class="col-6">
                <label class="form-label">
                  <i class="bi bi-calendar-event me-1"></i>
                  Expiration Date
                </label>
                <input
                  v-model="localForm.expirationDate"
                  type="date"
                  class="form-control"
                  readonly
                  disabled
                />
              </div>
            </div>

            <!-- Quantity and Unit Row -->
            <div class="row g-3">
              <div class="col-6">
                <label class="form-label">
                  <i class="bi bi-hash me-1"></i>
                  Quantity
                  <span class="text-danger">*</span>
                </label>
                <input
                  v-model.number="localForm.quantity"
                  type="number"
                  class="form-control"
                  :class="{ 'is-invalid': quantityExceeded }"
                  min="1"
                  step="1"
                  :max="maxShareQuantity"
                  placeholder="0"
                  required
                />
                <small v-if="!isEditMode" class="text-muted d-block mt-1">
                  Available: <strong>{{ maxShareQuantity }} {{ localForm.unit }}</strong>
                </small>
                <small v-else class="text-muted d-block mt-1">
                  Maximum: <strong>{{ maxShareQuantity }} {{ localForm.unit }}</strong>
                </small>
                <div v-if="quantityExceeded" class="invalid-feedback d-block">
                  Cannot exceed {{ maxShareQuantity }} {{ localForm.unit }}
                </div>
              </div>
              <div class="col-6">
                <label class="form-label">
                  <i class="bi bi-rulers me-1"></i>
                  Unit
                </label>
                <input
                  v-model="localForm.unit"
                  type="text"
                  class="form-control"
                  readonly
                  disabled
                />
              </div>
            </div>

            <!-- Pickup Time -->
            <div class="form-group">
              <label class="form-label">
                <i class="bi bi-clock-fill me-1"></i>
                Preferred Pickup Time
              </label>
              <input
                v-model="localForm.pickupTime"
                type="text"
                class="form-control"
                placeholder="E.g., weekdays, weekends, every Friday 10am"
              />
            </div>

            <!-- Additional Notes -->
            <div class="form-group">
              <label class="form-label">
                <i class="bi bi-chat-dots-fill me-1"></i>
                Additional Notes
              </label>
              <textarea
                v-model="localForm.notes"
                rows="3"
                class="form-control"
                placeholder="Any special notes..."
              ></textarea>
            </div>

            <!-- Location Picker -->
            <div class="form-group">
              <label class="form-label">
                <i class="bi bi-geo-alt-fill me-1"></i>
                Preferred Pickup Location
                <span class="text-danger">*</span>
              </label>
              <LocationPicker @place-selected="handleLocationSelect" />
              <small v-if="localForm.location" class="text-success d-block mt-2">
                <i class="bi bi-check-circle-fill me-1"></i>
                Selected: {{ localForm.location.address }}
              </small>
              <small v-else class="text-danger d-block mt-2">
                <i class="bi bi-exclamation-circle-fill me-1"></i>
                Please select a location
              </small>
            </div>

            <!-- Notes -->
            <div class="form-group mb-0">
              <label class="form-label">
                <i class="bi bi-chat-left-text-fill me-1"></i>
                Additional Notes
              </label>
              <textarea
                v-model="localForm.notes"
                class="form-control"
                rows="3"
                placeholder="Any special instructions or notes about the food item..."
              ></textarea>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button class="btn btn-cancel" @click="handleClose">
              <i class="bi bi-x-circle me-2"></i>
              Cancel
            </button>
            <button
              class="btn btn-share"
              @click="handleSubmit"
              :disabled="!isShareQuantityValid || !localForm.location"
            >
              <i :class="isEditMode ? 'bi bi-check-circle me-2' : 'bi bi-share me-2'"></i>
              {{ isEditMode ? 'Update Listing' : 'Share Food' }}
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
/* Modal Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-slide-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-slide-enter-from {
  opacity: 0;
  transform: translateY(-30px) scale(0.95);
}

.modal-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.98);
}

/* Backdrop */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}

/* Modal Card - Glassmorphism */
.modal-card {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 20px;
  width: 650px;
  max-width: 100%;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.8) inset,
    0 8px 32px rgba(16, 185, 129, 0.08);
  overflow: hidden;
  position: relative;
}

/* Decorative gradient overlay */
.modal-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #10b981, #059669, #06b6d4, #10b981);
  background-size: 200% 100%;
  animation: shimmer 3s ease infinite;
}

@keyframes shimmer {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* Modal Header */
.modal-header {
  padding: 1.75rem 2rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.03) 0%, rgba(6, 182, 212, 0.02) 100%);
  border-bottom: 1px solid rgba(16, 185, 129, 0.1);
}

.modal-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #10b981, #059669);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #059669, #10b981);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.btn-close-custom {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1.1rem;
}

.btn-close-custom:hover {
  background: rgba(239, 68, 68, 0.15);
  transform: scale(1.05);
}

/* Modal Body */
.modal-body {
  padding: 2rem;
  max-height: 65vh;
  overflow-y: auto;
}

.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: rgba(16, 185, 129, 0.05);
  border-radius: 10px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #10b981, #059669);
  border-radius: 10px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #059669, #047857);
}

/* Form Groups */
.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #374151;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  letter-spacing: 0.01em;
}

.form-label i {
  color: #10b981;
  font-size: 0.95rem;
}

.text-danger {
  color: #ef4444;
}

/* Form Controls */
.form-control,
.form-select {
  height: 48px;
  padding: 0.75rem 1rem;
  border: 2px solid rgba(16, 185, 129, 0.15);
  border-radius: 12px;
  font-size: 0.95rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

textarea.form-control {
  height: auto;
  resize: vertical;
  min-height: 100px;
}

.form-control::placeholder {
  color: #9ca3af;
  font-weight: 400;
}

.form-control:hover:not(:disabled),
.form-select:hover:not(:disabled) {
  border-color: rgba(16, 185, 129, 0.3);
  background: rgba(255, 255, 255, 1);
}

.form-control:focus,
.form-select:focus {
  border-color: #10b981;
  background: rgba(255, 255, 255, 1);
  box-shadow:
    0 0 0 4px rgba(16, 185, 129, 0.1),
    0 4px 12px rgba(16, 185, 129, 0.08);
  outline: none;
}

.form-control:disabled {
  background: rgba(243, 244, 246, 0.8);
  border-color: rgba(229, 231, 235, 0.8);
  color: #9ca3af;
  cursor: not-allowed;
}

.form-control.is-invalid {
  border-color: #ef4444;
}

.form-control.is-invalid:focus {
  box-shadow:
    0 0 0 4px rgba(239, 68, 68, 0.1),
    0 4px 12px rgba(239, 68, 68, 0.08);
}

.invalid-feedback {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.form-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2310b981' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
  padding-right: 2.5rem;
}

/* Modal Footer */
.modal-footer {
  padding: 1.25rem 2rem 1.75rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.02) 0%, rgba(6, 182, 212, 0.01) 100%);
  border-top: 1px solid rgba(16, 185, 129, 0.1);
}

/* Buttons */
.btn {
  height: 48px;
  padding: 0 1.75rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.2);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.btn:hover::before {
  opacity: 1;
}

.btn-cancel {
  background: rgba(107, 114, 128, 0.08);
  color: #4b5563;
  border: 2px solid rgba(107, 114, 128, 0.2);
}

.btn-cancel:hover {
  background: rgba(107, 114, 128, 0.15);
  border-color: rgba(107, 114, 128, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.btn-cancel:active {
  transform: translateY(0);
}

.btn-share {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  box-shadow:
    0 4px 12px rgba(16, 185, 129, 0.25),
    0 2px 6px rgba(16, 185, 129, 0.15);
  position: relative;
}

.btn-share:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-2px);
  box-shadow:
    0 8px 20px rgba(16, 185, 129, 0.35),
    0 4px 10px rgba(16, 185, 129, 0.2);
}

.btn-share:active:not(:disabled) {
  transform: translateY(0);
  box-shadow:
    0 2px 8px rgba(16, 185, 129, 0.25),
    0 1px 4px rgba(16, 185, 129, 0.15);
}

.btn-share:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Status Messages */
.text-success {
  color: #10b981;
  font-size: 0.875rem;
}

.text-muted {
  color: #6b7280;
  font-size: 0.875rem;
}

/* Responsive */
@media (max-width: 768px) {
  .modal-card {
    border-radius: 16px;
  }

  .modal-header {
    padding: 1.5rem 1.25rem 1rem;
  }

  .modal-body {
    padding: 1.25rem;
  }

  .modal-footer {
    padding: 1rem 1.25rem 1.5rem;
  }

  .modal-title {
    font-size: 1.25rem;
  }

  .modal-icon {
    width: 40px;
    height: 40px;
    font-size: 1.25rem;
  }
}
</style>
