let googleMapsPromise = null

export function loadGoogleMaps() {
  if (googleMapsPromise) {
    return googleMapsPromise
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google && window.google.maps) {
      resolve(window.google)
      return
    }

    // Create script element
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`
    script.async = true
    script.defer = true

    script.onload = () => {
      if (window.google && window.google.maps) {
        console.log('✅ Google Maps API loaded successfully')
        resolve(window.google)
      } else {
        reject(new Error('Google Maps API failed to load'))
      }
    }

    script.onerror = (error) => {
      console.error('❌ Failed to load Google Maps API:', error)
      reject(error)
    }

    document.head.appendChild(script)
  })

  return googleMapsPromise
}
