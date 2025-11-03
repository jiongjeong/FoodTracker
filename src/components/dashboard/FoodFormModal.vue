<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  mode: {
    type: String,
    required: true,
    validator: (value) => ['add', 'edit'].includes(value)
  },
  formData: {
    type: Object,
    required: true
  },
  categories: {
    type: Array,
    required: true
  },
  availableUnits: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['close', 'save', 'update:formData'])

// Local form state
const localForm = ref({ ...props.formData })

// Watch for external form data changes
watch(() => props.formData, (newVal) => {
  localForm.value = { ...newVal }
}, { deep: true })

// Computed properties
const modalTitle = computed(() => props.mode === 'add' ? 'Add Food Item' : 'Edit Food Item')
const saveButtonText = computed(() => props.mode === 'add' ? 'Add' : 'Save')

// Title case utility
const titleCase = (str) => {
  if (!str || typeof str !== 'string') return ''
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Handle name input with title case
const onNameInput = (event) => {
  const el = event.target
  const start = el.selectionStart
  const end = el.selectionEnd
  const raw = el.value || ''

  const transformed = raw.replace(/\S+/g, (w) => {
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  })

  if (transformed !== raw) {
    localForm.value.name = transformed
    setTimeout(() => {
      try {
        el.selectionStart = start
        el.selectionEnd = end
      } catch {
        // ignore - cursor restoration failed
      }
    }, 0)
  } else {
    localForm.value.name = raw
  }
}

// Apply title case on blur
const applyTitleCase = () => {
  localForm.value.name = titleCase(localForm.value.name || '')
}

// Handle close
const handleClose = () => {
  emit('close')
}

// Handle save
const handleSave = () => {
  emit('save', localForm.value)
}

// Category placeholder text
const categoryPlaceholder = computed(() => {
  if (props.mode === 'edit' && localForm.value.category) {
    return localForm.value.category
  }
  return 'Select a category'
})

// Unit placeholder text
const unitPlaceholder = computed(() => {
  if (props.mode === 'edit' && localForm.value.unit) {
    return localForm.value.unit
  }
  return 'Select a unit'
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
                <i :class="mode === 'add' ? 'bi bi-plus-circle-fill' : 'bi bi-pencil-square'"></i>
              </div>
              <h3 class="modal-title mb-0">{{ modalTitle }}</h3>
            </div>
            <button class="btn-close-custom" @click="handleClose" aria-label="Close">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">
                <i class="bi bi-tag-fill me-1"></i>
                Name
              </label>
              <input
                v-model="localForm.name"
                @input="onNameInput"
                @blur="applyTitleCase"
                class="form-control"
                placeholder="e.g., Baby Spinach, Fresh Tomatoes..."
              />
            </div>

            <div class="form-group">
              <label class="form-label">
                <i class="bi bi-bookmark-fill me-1"></i>
                Category
              </label>
              <select v-model="localForm.category" class="form-select">
                <option disabled value="">{{ categoryPlaceholder }}</option>
                <option
                  v-for="cat in categories.filter((c) => c !== 'All Categories')"
                  :key="cat"
                  :value="cat"
                >
                  {{ cat }}
                </option>
              </select>
            </div>

            <div class="row g-3">
              <div class="col-6">
                <label class="form-label">
                  <i class="bi bi-calendar-event me-1"></i>
                  Expiration Date
                </label>
                <input
                  v-model="localForm.expirationDate"
                  type="date"
                  class="form-control"
                />
              </div>
              <div class="col-6">
                <label class="form-label">
                  <i class="bi bi-calendar-check me-1"></i>
                  Created At
                </label>
                <input
                  v-model="localForm.createdAt"
                  type="date"
                  class="form-control"
                  disabled
                />
              </div>
            </div>

            <div class="row g-3">
              <div class="col-4">
                <label class="form-label">
                  <i class="bi bi-currency-dollar me-1"></i>
                  Total Price
                </label>
                <input
                  v-model="localForm.price"
                  type="number"
                  step="0.01"
                  class="form-control"
                  placeholder="0.00"
                />
              </div>
              <div class="col-4">
                <label class="form-label">
                  <i class="bi bi-hash me-1"></i>
                  Quantity
                </label>
                <input
                  v-model="localForm.quantity"
                  type="number"
                  class="form-control"
                  placeholder="0"
                />
              </div>
              <div class="col-4">
                <label class="form-label">
                  <i class="bi bi-rulers me-1"></i>
                  Unit
                </label>
                <select v-model="localForm.unit" class="form-select">
                  <option disabled value="">{{ unitPlaceholder }}</option>
                  <option v-for="unit in availableUnits" :key="unit" :value="unit">
                    {{ unit }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button class="btn btn-cancel" @click="handleClose">
              <i class="bi bi-x-circle me-2"></i>
              Cancel
            </button>
            <button class="btn btn-save" @click="handleSave">
              <i :class="mode === 'add' ? 'bi bi-plus-lg me-2' : 'bi bi-check-lg me-2'"></i>
              {{ saveButtonText }}
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

.form-control::placeholder {
  color: #9ca3af;
  font-weight: 400;
}

.form-control:hover,
.form-select:hover {
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

.btn-save {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  box-shadow:
    0 4px 12px rgba(16, 185, 129, 0.25),
    0 2px 6px rgba(16, 185, 129, 0.15);
  position: relative;
}

.btn-save:hover {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-2px);
  box-shadow:
    0 8px 20px rgba(16, 185, 129, 0.35),
    0 4px 10px rgba(16, 185, 129, 0.2);
}

.btn-save:active {
  transform: translateY(0);
  box-shadow:
    0 2px 8px rgba(16, 185, 129, 0.25),
    0 1px 4px rgba(16, 185, 129, 0.15);
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
