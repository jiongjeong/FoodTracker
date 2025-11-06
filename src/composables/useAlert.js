import { ref } from 'vue'

const alertState = ref({
  show: false,
  type: 'info',
  title: 'Alert',
  message: '',
  confirmText: 'OK',
  cancelText: 'Cancel',
  showCancel: false,
  closeOnOverlayClick: true,
  onConfirm: null,
  onCancel: null
})

export function useAlert() {
  const showAlert = (options) => {
    return new Promise((resolve) => {
      alertState.value = {
        show: true,
        type: options.type || 'info',
        title: options.title || 'Alert',
        message: options.message || '',
        confirmText: options.confirmText || 'OK',
        cancelText: options.cancelText || 'Cancel',
        showCancel: options.showCancel || false,
        closeOnOverlayClick: options.closeOnOverlayClick !== undefined ? options.closeOnOverlayClick : true,
        onConfirm: () => {
          resolve(true)
          if (options.onConfirm) options.onConfirm()
        },
        onCancel: () => {
          resolve(false)
          if (options.onCancel) options.onCancel()
        }
      }
    })
  }

  const hideAlert = () => {
    alertState.value.show = false
  }

  const success = (message, title = 'Success') => {
    return showAlert({ type: 'success', title, message })
  }

  const error = (message, title = 'Error') => {
    return showAlert({ type: 'error', title, message })
  }

  const warning = (message, title = 'Warning') => {
    return showAlert({ type: 'warning', title, message })
  }

  const info = (message, title = 'Info') => {
    return showAlert({ type: 'info', title, message })
  }

  const confirm = (message, title = 'Confirm') => {
    return showAlert({
      type: 'warning',
      title,
      message,
      showCancel: true,
      confirmText: 'Yes',
      cancelText: 'No'
    })
  }

  return {
    alertState,
    showAlert,
    hideAlert,
    success,
    error,
    warning,
    info,
    confirm
  }
}
