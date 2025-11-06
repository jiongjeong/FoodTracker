<script setup>
import { ref } from 'vue'
import LocationPicker from '@/components/LocationPicker.vue'

defineProps({
  mySharedItemsCount: {
    type: Number,
    default: 0
  },
  availableItemsCount: {
    type: Number,
    default: 0
  },
  preferredLocation: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['location-selected', 'location-cleared'])

const locationPickerRef = ref(null)

const handleLocationSelected = (place) => {
  emit('location-selected', place)
  if (locationPickerRef.value) {
    locationPickerRef.value.reset()
  }
}

const handleClearLocation = () => {
  emit('location-cleared')
}
</script>

<template>
  <div class="compact-hero position-relative py-4 py-md-5 mb-4 hero-section">
    <!-- Community Connection Background -->
    <div class="position-absolute top-0 start-0 w-100 h-100 community-connections" style="z-index: 0;">
      <!-- Decorative Blobs -->
      <div class="position-absolute top-0 end-0 h-100 w-50 community-blobs pe-none">
        <div class="blob blob-green position-absolute top-0 end-0 rounded-circle opacity-75 shadow"></div>
        <div class="blob blob-blue position-absolute bottom-0 end-0 rounded-circle opacity-75 shadow"></div>
      </div>

      <!-- Connection Network Animation -->
      <svg class="connection-network position-absolute w-100 h-100" viewBox="0 0 800 400" preserveAspectRatio="none">
        <defs>
          <radialGradient id="nodeGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:#10b981;stop-opacity:0.8" />
            <stop offset="100%" style="stop-color:#10b981;stop-opacity:0.2" />
          </radialGradient>
        </defs>

        <!-- Connection nodes -->
        <circle class="connection-node node-1" cx="120" cy="150" r="6" fill="url(#nodeGradient)"/>
        <circle class="connection-node node-2" cx="280" cy="120" r="5" fill="url(#nodeGradient)"/>
        <circle class="connection-node node-3" cx="450" cy="180" r="7" fill="url(#nodeGradient)"/>
        <circle class="connection-node node-4" cx="600" cy="140" r="5" fill="url(#nodeGradient)"/>
        <circle class="connection-node node-5" cx="180" cy="280" r="6" fill="url(#nodeGradient)"/>
        <circle class="connection-node node-6" cx="380" cy="250" r="5" fill="url(#nodeGradient)"/>
        <circle class="connection-node node-7" cx="520" cy="260" r="6" fill="url(#nodeGradient)"/>
        <circle class="connection-node node-8" cx="350" cy="100" r="4" fill="url(#nodeGradient)"/>
        <circle class="connection-node node-9" cx="90" cy="220" r="5" fill="url(#nodeGradient)"/>

        <!-- Connection lines -->
        <line class="connection-link link-1" x1="120" y1="150" x2="280" y2="120" stroke="#10b981" stroke-width="1.5" opacity="0.4"/>
        <line class="connection-link link-2" x1="280" y1="120" x2="450" y2="180" stroke="#10b981" stroke-width="1.5" opacity="0.4"/>
        <line class="connection-link link-3" x1="450" y1="180" x2="600" y2="140" stroke="#10b981" stroke-width="1.5" opacity="0.4"/>
        <line class="connection-link link-4" x1="120" y1="150" x2="180" y2="280" stroke="#10b981" stroke-width="1.5" opacity="0.4"/>
        <line class="connection-link link-5" x1="180" y1="280" x2="380" y2="250" stroke="#10b981" stroke-width="1.5" opacity="0.4"/>
        <line class="connection-link link-6" x1="380" y1="250" x2="450" y2="180" stroke="#10b981" stroke-width="1.5" opacity="0.4"/>
        <line class="connection-link link-7" x1="450" y1="180" x2="520" y2="260" stroke="#10b981" stroke-width="1.2" opacity="0.3"/>
        <line class="connection-link link-8" x1="280" y1="120" x2="350" y2="100" stroke="#10b981" stroke-width="1.2" opacity="0.3"/>
        <line class="connection-link link-9" x1="350" y1="100" x2="450" y2="180" stroke="#10b981" stroke-width="1.2" opacity="0.3"/>
        <line class="connection-link link-10" x1="120" y1="150" x2="90" y2="220" stroke="#10b981" stroke-width="1.2" opacity="0.3"/>
        <line class="connection-link link-11" x1="90" y1="220" x2="180" y2="280" stroke="#10b981" stroke-width="1.2" opacity="0.3"/>
        <line class="connection-link link-12" x1="380" y1="250" x2="520" y2="260" stroke="#10b981" stroke-width="1.2" opacity="0.3"/>
        <line class="connection-link link-13" x1="520" y1="260" x2="600" y2="140" stroke="#10b981" stroke-width="1.2" opacity="0.3"/>
        <line class="connection-link link-14" x1="350" y1="100" x2="600" y2="140" stroke="#10b981" stroke-width="1" opacity="0.25"/>

        <!-- Animated pulse lines -->
        <line class="pulse-line pulse-1" x1="120" y1="150" x2="280" y2="120" stroke="#22c55e" stroke-width="2" opacity="0"/>
        <line class="pulse-line pulse-2" x1="280" y1="120" x2="450" y2="180" stroke="#22c55e" stroke-width="2" opacity="0"/>
        <line class="pulse-line pulse-3" x1="450" y1="180" x2="600" y2="140" stroke="#22c55e" stroke-width="2" opacity="0"/>
        <line class="pulse-line pulse-4" x1="180" y1="280" x2="380" y2="250" stroke="#22c55e" stroke-width="2" opacity="0"/>
        <line class="pulse-line pulse-5" x1="350" y1="100" x2="450" y2="180" stroke="#22c55e" stroke-width="2" opacity="0"/>
        <line class="pulse-line pulse-6" x1="380" y1="250" x2="520" y2="260" stroke="#22c55e" stroke-width="2" opacity="0"/>
      </svg>
    </div>

    <div class="container-fluid px-3 px-md-4 position-relative" style="z-index: 10;">
      <div class="row align-items-center g-5">
        <!-- Title & Description -->
        <div class="col-lg-6">
          <div class="hero-content">
            <h1 class="display-5 fw-bold mb-3" style="line-height: 1.3; white-space: nowrap;">
              <span class="text-success">Community</span><br>
              <span class="typing-line-1">Food Sharing</span>
            </h1>
            <p class="lead text-dark mb-4">
              Share expiring food with neighbours<br>
              to reduce waste and build community
            </p>

            <!-- Stats Row -->
            <div class="d-flex gap-4 flex-wrap">
              <div class="stats-card d-flex align-items-center gap-3 px-4 py-3 rounded-4"
                   style="background: rgba(255, 255, 255, 0.3); backdrop-filter: blur(10px);">
                <i class="bi bi-people-fill fs-2 text-dark"></i>
                <div>
                  <strong class="d-block fs-5 text-dark">{{ mySharedItemsCount }}</strong>
                  <small class="text-dark">Items Shared</small>
                </div>
              </div>
              <div class="stats-card d-flex align-items-center gap-3 px-4 py-3 rounded-4"
                   style="background: rgba(255, 255, 255, 0.3); backdrop-filter: blur(10px);">
                <i class="bi bi-box-seam fs-2 text-dark"></i>
                <div>
                  <strong class="d-block fs-5 text-dark">{{ availableItemsCount }}</strong>
                  <small class="text-dark">Available</small>
                </div>
              </div>
              <div class="stats-card d-flex align-items-center gap-3 px-4 py-3 rounded-4"
                   style="background: rgba(255, 255, 255, 0.3); backdrop-filter: blur(10px);">
                <i class="bi bi-recycle fs-2 text-dark"></i>
                <div>
                  <strong class="d-block fs-5 text-dark">Zero</strong>
                  <small class="text-dark">Waste Goal</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Location Picker Card -->
        <div class="col-lg-6">
          <div class="location-picker-card card border-0 shadow-lg rounded-4 position-relative p-1"
               style="min-height: 300px; transition: all 0.3s ease;">

            <!-- Step Badge -->
            <div class="step-badge position-absolute d-flex align-items-center justify-content-center rounded-circle fw-bold shadow-lg"
                 style="top: -12px; left: -12px; width: 56px; height: 56px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; font-size: 1.25rem;">
              <i class="bi bi-geo-alt-fill"></i>
            </div>

            <div class="card-body p-4 text-center">
              <!-- Centered Icon -->
              <div class="mx-auto mb-4 rounded-circle d-flex align-items-center justify-content-center"
                   style="width: 80px; height: 80px; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); color: #22c55e; transition: all 0.3s ease;">
                <i class="bi bi-pin-map-fill" style="font-size: 2.5rem;"></i>
              </div>

              <!-- Title -->
              <h3 class="fw-bold mb-2 fs-4">Pickup Location</h3>
              <p class="text-muted mb-4">Find items near you</p>

              <!-- Location Picker Body -->
              <div class="mt-2">
                <template v-if="!preferredLocation">
                  <div class="text-center py-4">
                    <p class="text-muted mb-3">Set your preferred location to see distances</p>
                    <LocationPicker @place-selected="handleLocationSelected" />
                  </div>
                </template>

                <!-- Location selected -->
                <template v-else>
                  <div>
                    <div class="d-flex align-items-start gap-3 p-3 rounded-3 border border-2 text-start"
                         style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);">
                      <i class="bi bi-geo-alt-fill text-success fs-4 mt-1"></i>
                      <div class="flex-grow-1">
                        <strong class="d-block">Current Location</strong>
                        <small class="text-muted">{{ preferredLocation.address }}</small>
                      </div>
                      <button @click="handleClearLocation"
                              class="btn btn-sm btn-outline-danger rounded-circle p-0"
                              style="width: 32px; height: 32px;"
                              title="Clear location">
                        <i class="bi bi-x-lg"></i>
                      </button>
                    </div>

                    <div class="mt-3 text-start">
                      <label class="form-label text-muted small mb-2">
                        <i class="bi bi-arrow-repeat me-1"></i>
                        Change Location
                      </label>
                      <LocationPicker ref="locationPickerRef" @place-selected="handleLocationSelected" class="w-100" />
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero-section {
  background: linear-gradient(135deg, #fefefe 0%, #f9f7f4 40%, #f5f2ed 100%);
}

.community-connections {
  pointer-events: none;
}

.community-blobs {
  z-index: 0;
}

.blob {
  width: 280px;
  height: 280px;
}

.blob-green {
  background: radial-gradient(circle at 30% 30%, #34d399, #10b981);
  transform: translate(20%, -20%);
  animation: blobFloat1 8s ease-in-out infinite;
}

.blob-blue {
  width: 220px;
  height: 220px;
  background: radial-gradient(circle at 70% 70%, #60a5fa, #3b82f6);
  transform: translate(20%, 20%);
  animation: blobFloat2 10s ease-in-out infinite reverse;
}

@keyframes blobFloat1 {
  0%, 100% { transform: translate(20%, -20%) scale(1); }
  50% { transform: translate(25%, -15%) scale(1.05); }
}

@keyframes blobFloat2 {
  0%, 100% { transform: translate(20%, 20%) scale(1); }
  50% { transform: translate(15%, 25%) scale(0.95); }
}

.connection-network {
  pointer-events: none;
  opacity: 0.7;
}

.connection-node {
  animation: nodePulse 4s ease-in-out infinite;
}

.node-1 { animation-delay: 0s; }
.node-2 { animation-delay: 0.4s; }
.node-3 { animation-delay: 0.8s; }
.node-4 { animation-delay: 1.2s; }
.node-5 { animation-delay: 1.6s; }
.node-6 { animation-delay: 2s; }
.node-7 { animation-delay: 2.4s; }
.node-8 { animation-delay: 2.8s; }
.node-9 { animation-delay: 3.2s; }

@keyframes nodePulse {
  0%, 100% {
    r: 5;
    opacity: 0.6;
  }
  50% {
    r: 8;
    opacity: 1;
  }
}

.connection-link {
  opacity: 0.3;
  transition: opacity 0.3s ease;
}

.pulse-line {
  stroke-linecap: round;
  animation: pulseTravelBrighter 3s ease-in-out infinite;
}

.pulse-1 { animation-delay: 0s; }
.pulse-2 { animation-delay: 0.8s; }
.pulse-3 { animation-delay: 1.6s; }
.pulse-4 { animation-delay: 2.4s; }
.pulse-5 { animation-delay: 3.2s; }
.pulse-6 { animation-delay: 4s; }

@keyframes pulseTravelBrighter {
  0% {
    opacity: 0;
    stroke-dasharray: 0, 1000;
  }
  20% {
    opacity: 0.8;
    stroke-dasharray: 20, 1000;
  }
  80% {
    opacity: 0.8;
    stroke-dasharray: 20, 1000;
    stroke-dashoffset: -100;
  }
  100% {
    opacity: 0;
    stroke-dasharray: 0, 1000;
    stroke-dashoffset: -100;
  }
}

.hero-content h1 {
  color: #1a1a1a;
  letter-spacing: -1px;
}

.hero-content p.lead {
  color: #374151;
}

.card:hover .rounded-circle {
  transform: scale(1.1);
}

.typing-line-1 {
  overflow: hidden;
  display: inline-block;
  border-right: 3px solid #666;
  white-space: nowrap;
  width: 0;
  animation: typing 1.5s steps(12, end) forwards, blink 0.75s step-end infinite 1.5s, cursorFade 0.5s ease-out 3s forwards;
}

@keyframes typing {
  from { width: 0 }
  to { width: 12ch }
}

@keyframes blink {
  50% { border-color: transparent }
}

@keyframes cursorFade {
  to { border-color: transparent }
}

@media (max-width: 992px) {
  .hero-section {
    min-height: auto;
    padding: 30px 15px;
  }

  .hero-content h1 {
    font-size: 2.5rem !important;
  }
}

.stats-card {
  padding: 20px 24px;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 2px solid #e5e7eb;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
  overflow-y: hidden;
  max-width: 100%;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.location-picker-card {
  animation: fadeInUp 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.location-picker-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15) !important;
}

.location-picker-card:hover .step-badge {
  transform: scale(1.1);
  box-shadow: 0 8px 20px rgba(34, 197, 94, 0.4);
}

@media (max-width: 768px) {
  .community-blobs .blob {
    opacity: 0.4;
  }

  .blob-green {
    width: 200px;
    height: 200px;
  }

  .blob-blue {
    width: 150px;
    height: 150px;
  }

  .connection-network {
    opacity: 0.4;
  }
}

@media (max-width: 575px) {
  .community-connections {
    z-index: 0 !important;
    pointer-events: none !important;
  }

  .community-blobs .blob {
    opacity: 0.2;
  }

  .connection-network {
    opacity: 0.2;
  }
}
</style>
