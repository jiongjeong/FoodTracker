let googleMapsPromise = null

export function loadGoogleMaps() {
  if (googleMapsPromise) return googleMapsPromise

  googleMapsPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window not available'))
      return
    }

    if (window.google?.maps?.geometry) {
      resolve(window.google)
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places,geometry&loading=async`
    script.async = true
    script.defer = true

    script.onload = () => {
      // POLL UNTIL geometry IS READY
      const maxAttempts = 50
      let attempts = 0
      const interval = setInterval(() => {
        if (window.google?.maps?.geometry) {
          clearInterval(interval)
          console.log('Google Maps API fully loaded (geometry ready)')
          resolve(window.google)
        } else if (attempts++ > maxAttempts) {
          clearInterval(interval)
          reject(new Error('Google Maps geometry library failed to load'))
        }
      }, 100)
    }

    script.onerror = (error) => {
      reject(new Error('Failed to load Google Maps script'))
    }

    document.head.appendChild(script)
  })

  return googleMapsPromise
}