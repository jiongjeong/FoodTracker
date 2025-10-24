<script setup>
import { ref, onMounted } from "vue"

const placeInput = ref(null)
const selectedPlace = ref(null)

onMounted(() => {
  if (!window.google) {
    console.error("Google Maps API not loaded")
    return
  }

  const autocomplete = new google.maps.places.Autocomplete(placeInput.value, {
    types: ['geocode'], // you can use ['establishment'] for businesses
    componentRestrictions: { country: "SG" } // restrict to Singapore
  })

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace()
    if (place.geometry) {
      selectedPlace.value = {
        name: place.formatted_address,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      }
      console.log("Selected place:", selectedPlace.value)
    }
  })
})
</script>

<template>
  <div>
    <label class="form-label">Selected Pickup Location</label>
    <input
      type="text"
      class="form-control"
      ref="placeInput"
      placeholder="Search for a location..."
    />

    <div v-if="selectedPlace" class="mt-2 text-muted">
      <small>📍 {{ selectedPlace.name }}</small>
    </div>
  </div>
</template>
