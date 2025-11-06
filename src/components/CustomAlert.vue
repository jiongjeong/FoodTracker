<template>
  <Teleport to="body">
    <Transition name="alert-fade">
      <div v-if="show" class="alert-overlay" @click="closeOnOverlay">
        <div class="alert-box" :class="`alert-${type}`" @click.stop>
          <!-- Icon -->
          <div class="alert-icon">
            <i v-if="type === 'success'" class="bi bi-check-circle-fill"></i>
            <i v-else-if="type === 'error'" class="bi bi-x-circle-fill"></i>
            <i v-else-if="type === 'warning'" class="bi bi-exclamation-triangle-fill"></i>
            <i v-else-if="type === 'info'" class="bi bi-info-circle-fill"></i>
          </div>

          <!-- Content -->
          <div class="alert-content">
            <h3 class="alert-title">{{ title }}</h3>
            <p class="alert-message">{{ message }}</p>
          </div>

          <!-- Actions -->
          <div class="alert-actions">
            <button
              v-if="showCancel"
              class="btn-alert btn-cancel"
              @click="handleCancel"
            >
              {{ cancelText }}
            </button>
            <button
              class="btn-alert btn-confirm"
              :class="`btn-${type}`"
              @click="handleConfirm"
            >
              {{ confirmText }}
            </button>
          </div>

          <!-- Close button -->
          <button class="alert-close" @click="handleClose">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
  },
  title: {
    type: String,
    default: 'Alert'
  },
  message: {
    type: String,
    required: true
  },
  confirmText: {
    type: String,
    default: 'OK'
  },
  cancelText: {
    type: String,
    default: 'Cancel'
  },
  showCancel: {
    type: Boolean,
    default: false
  },
  closeOnOverlayClick: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['confirm', 'cancel', 'close', 'update:show'])

function handleConfirm() {
  emit('confirm')
  emit('update:show', false)
}

function handleCancel() {
  emit('cancel')
  emit('update:show', false)
}

function handleClose() {
  emit('close')
  emit('update:show', false)
}

function closeOnOverlay() {
  if (props.closeOnOverlayClick) {
    handleClose()
  }
}
</script>

<style scoped>
.alert-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.alert-box {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.alert-icon {
  text-align: center;
  margin-bottom: 20px;
}

.alert-icon i {
  font-size: 64px;
}

.alert-success .alert-icon i {
  color: #28a745;
}

.alert-error .alert-icon i {
  color: #dc3545;
}

.alert-warning .alert-icon i {
  color: #ffc107;
}

.alert-info .alert-icon i {
  color: #17a2b8;
}

.alert-content {
  text-align: center;
  margin-bottom: 24px;
}

.alert-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 12px 0;
  color: #333;
}

.alert-message {
  font-size: 16px;
  color: #666;
  margin: 0;
  line-height: 1.5;
}

.alert-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-alert {
  padding: 12px 32px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-confirm {
  color: white;
}

.btn-success {
  background: #28a745;
}

.btn-success:hover {
  background: #218838;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
}

.btn-error {
  background: #dc3545;
}

.btn-error:hover {
  background: #c82333;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
}

.btn-warning {
  background: #ffc107;
  color: #333;
}

.btn-warning:hover {
  background: #e0a800;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3);
}

.btn-info {
  background: #17a2b8;
}

.btn-info:hover {
  background: #138496;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(23, 162, 184, 0.3);
}

.btn-cancel {
  background: #6c757d;
  color: white;
}

.btn-cancel:hover {
  background: #5a6268;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
}

.alert-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.alert-close:hover {
  background: #f0f0f0;
  color: #333;
}

/* Transitions */
.alert-fade-enter-active,
.alert-fade-leave-active {
  transition: opacity 0.3s ease;
}

.alert-fade-enter-from,
.alert-fade-leave-to {
  opacity: 0;
}

.alert-fade-enter-active .alert-box {
  animation: slideUp 0.3s ease-out;
}

.alert-fade-leave-active .alert-box {
  animation: slideDown 0.3s ease-in;
}

@keyframes slideDown {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(20px);
  }
}

/* Responsive */
@media (max-width: 576px) {
  .alert-box {
    padding: 24px;
    margin: 0 16px;
  }

  .alert-icon i {
    font-size: 48px;
  }

  .alert-title {
    font-size: 20px;
  }

  .alert-message {
    font-size: 14px;
  }

  .alert-actions {
    flex-direction: column;
  }

  .btn-alert {
    width: 100%;
    padding: 12px 24px;
  }
}
</style>
