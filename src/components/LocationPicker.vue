<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { loadGoogleMaps } from '@/composables/loadGoogleMap.js'

const inputRef = ref(null)
const selectedPlace = ref(null)
const isLoading = ref(true)
const error = ref(null)
let autocomplete = null

const emit = defineEmits(['place-selected'])

// Expose reset method to parent components
defineExpose({
  reset: () => {
    if (inputRef.value) {
      inputRef.value.value = ''
    }
    selectedPlace.value = null
  }
})

async function initializeAutocomplete() {
  try {

    const google = await loadGoogleMaps()
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 200))

    if (!inputRef.value) {
      throw new Error('Input element not found after waiting')
    }

    autocomplete = new google.maps.places.Autocomplete(inputRef.value, {
      fields: ['place_id', 'geometry', 'name', 'formatted_address', 'address_components']
    })

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()

      if (!place || !place.geometry || !place.geometry.location) {
        console.warn('⚠️ No valid location found')
        error.value = 'Please select a valid location from the dropdown'
        return
      }

      const location = place.geometry.location

      selectedPlace.value = {
        name: place.name || place.formatted_address?.split(',')[0] || 'Unknown',
        address: place.formatted_address || '',
        lat: location.lat(),
        lng: location.lng(),
        placeId: place.place_id
      }

      error.value = null
      emit('place-selected', selectedPlace.value)
    })

    isLoading.value = false

  } catch (err) {
    console.error('❌ Failed to initialize LocationPicker:', err)
    error.value = `Failed to load location picker: ${err.message}`
    isLoading.value = false
  }
}

onMounted(() => {
  initializeAutocomplete()
})

onUnmounted(() => {
  if (autocomplete && window.google?.maps?.event) {
    try {
      window.google.maps.event.clearInstanceListeners(autocomplete)
    } catch (e) {
      console.warn('Error cleaning up autocomplete:', e)
    }
  }
})
</script>

<template>
  <div class="location-picker">

    <input
      id="location-input"
      ref="inputRef"
      type="text"
      class="location-input"
      :placeholder="isLoading ? 'Loading...' : 'Start typing a location (e.g., Dhoby Ghaut MRT Station)...'"
      :disabled="isLoading"
      autocomplete="off"
    />

    <!-- Loading indicator -->
    <div v-if="isLoading" class="loading-state">
      <span class="spinner"></span>
      <span>Loading location picker...</span>
    </div>

    <!-- Error state -->
    <div v-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="initializeAutocomplete" class="retry-btn">Retry</button>
    </div>

    <!-- Selected place display -->
    <div v-if="selectedPlace && !isLoading" class="selected-place">
      <p class="place-name">✓ {{ selectedPlace.name }}</p>
      <p class="place-address">{{ selectedPlace.address }}</p>
      <p class="place-coords">
        Lat: {{ Number(selectedPlace.lat).toFixed(6) }},
        Lng: {{ Number(selectedPlace.lng).toFixed(6) }}
      </p>
    </div>

    <p v-else-if="!isLoading && !error" class="placeholder-text">
      Type an address and select from the dropdown
    </p>
  </div>
</template>

<style scoped>
.location-picker {
  margin-bottom: 1.5rem;
}

.label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
}

.location-input {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  line-height: 1.5;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  outline: none;
  transition: all 0.2s ease;
  background: white;
  font-family: inherit;
  box-sizing: border-box;
}

.location-input:focus {
  border-color: #059669;
  box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
}

.location-input:disabled {
  background: #f9fafb;
  cursor: not-allowed;
  opacity: 0.6;
}

.location-input::placeholder {
  color: #9ca3af;
}

/* Loading state */
.loading-state {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  margin-top: 0.5rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #6b7280;
  font-size: 0.9rem;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top-color: #059669;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error state */
.error-state {
  padding: 1rem;
  margin-top: 0.5rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 0.9rem;
}

.retry-btn {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
}

.retry-btn:hover {
  background: #b91c1c;
}

/* Google's autocomplete dropdown styling */
:global(.pac-container) {
  z-index: 10000 !important;
  margin-top: 4px;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border: 1px solid #e5e7eb;
  font-family: inherit;
  background: white;
}

:global(.pac-item) {
  padding: 12px 16px;
  cursor: pointer;
  font-size: 0.95rem;
  border-top: 1px solid #f3f4f6;
  line-height: 1.5;
  transition: background-color 0.15s ease;
}

:global(.pac-item:first-child) {
  border-top: none;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

:global(.pac-item:last-child) {
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

:global(.pac-item:hover) {
  background-color: #f0fdf4;
}

:global(.pac-item-selected) {
  background-color: #d1fae5;
}

:global(.pac-icon) {
  margin-right: 10px;
  margin-top: 3px;
}

:global(.pac-item-query) {
  font-weight: 600;
  color: #1f2937;
}

:global(.pac-matched) {
  font-weight: 700;
  color: #059669;
}

/* Selected place display */
.selected-place {
  margin-top: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%);
  border: 2px solid #d1fae5;
  border-radius: 8px;
}

.place-name {
  font-weight: 700;
  color: #059669;
  margin-bottom: 0.25rem;
  font-size: 1rem;
}

.place-address {
  color: #6b7280;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.place-coords {
  font-size: 0.75rem;
  color: #9ca3af;
  font-family: 'Courier New', monospace;
}

.placeholder-text {
  margin-top: 0.75rem;
  font-size: 0.9rem;
  color: #6b7280;
}
</style>
