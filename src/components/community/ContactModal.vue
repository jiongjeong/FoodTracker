<script setup>
defineProps({
  show: {
    type: Boolean,
    required: true
  },
  contact: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])

const getGoogleMapsUrl = (location) => {
  if (!location?.lat || !location?.lng) return null
  return `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <div v-if="show" class="modal fade show d-block" tabindex="-1" style="z-index: 1055;">
    <div class="modal-backdrop fade show" @click="handleClose" style="z-index: 1050;"></div>
    <div class="modal-dialog modal-dialog-centered contact-modal-dialog" style="z-index: 1060;">
      <div class="modal-content contact-modal-content">
        <!-- Header -->
        <div class="contact-modal-header">
          <h5 class="contact-name">{{ contact?.foodName }}</h5>
          <button type="button" class="btn-close" @click="handleClose"></button>
        </div>

        <div class="modal-body contact-modal-body">
          <!-- Shared By -->
          <div class="contact-info-item">
            <i class="bi bi-person-fill"></i>
            <span class="contact-label">Shared by:</span>
            <span class="contact-value">{{ contact?.sharedBy }}</span>
          </div>

          <!-- Quantity -->
          <div class="contact-info-item">
            <i class="bi bi-layers-fill"></i>
            <span class="contact-label">Quantity:</span>
            <span class="contact-value">{{ contact?.quantity }} {{ contact?.unit }}</span>
          </div>

          <!-- Expiration -->
          <div class="contact-info-item">
            <i class="bi bi-calendar-check"></i>
            <span class="contact-label">Expires in:</span>
            <span class="contact-value" :class="{
              'text-danger': contact?.daysUntilExpiration <= 2,
              'text-warning': contact?.daysUntilExpiration <= 5 && contact?.daysUntilExpiration > 2,
              'text-success': contact?.daysUntilExpiration > 5
            }">
              {{ contact?.daysUntilExpiration }} day{{ contact?.daysUntilExpiration !== 1 ? 's' : '' }}
            </span>
          </div>

          <!-- Email -->
          <div class="contact-info-item" v-if="contact?.contact?.email">
            <i class="bi bi-envelope-fill"></i>
            <span class="contact-label">Email:</span>
            <a :href="`mailto:${contact.contact.email}`" class="contact-value contact-link">
              {{ contact.contact.email }}
            </a>
          </div>

          <!-- Phone -->
          <div class="contact-info-item" v-if="contact?.contact?.phone && contact.contact.phone !== 'Not provided'">
            <i class="bi bi-telephone-fill"></i>
            <span class="contact-label">Phone:</span>
            <a :href="`tel:${contact.contact.phone}`" class="contact-value contact-link">
              {{ contact.contact.phone }}
            </a>
          </div>

          <!-- Handle -->
          <div class="contact-info-item" v-if="contact?.contact?.handle">
            <i class="bi bi-at"></i>
            <span class="contact-label">Telegram:</span>
            <span class="contact-value">{{ contact.contact.handle }}</span>
          </div>

          <!-- Pickup Time -->
          <div class="contact-info-item" v-if="contact?.pickupTime && contact.pickupTime !== 'Not specified'">
            <i class="bi bi-clock-fill"></i>
            <span class="contact-label">Pickup Time:</span>
            <span class="contact-value">{{ contact.pickupTime }}</span>
          </div>

          <!-- Location -->
          <div class="contact-info-item" v-if="contact?.location?.address">
            <i class="bi bi-geo-alt-fill"></i>
            <span class="contact-label">Location:</span>
            <span class="contact-value">{{ contact.location.address }}</span>
          </div>

          <!-- Map -->
          <div class="contact-map" v-if="contact?.location?.lat && contact?.location?.lng">
            <a :href="getGoogleMapsUrl(contact.location)" target="_blank" class="map-link">
              <iframe
                :src="`https://www.google.com/maps?q=${contact.location.lat},${contact.location.lng}&output=embed&z=15`"
                class="map-iframe" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
              <div class="map-overlay">
                <i class="bi bi-box-arrow-up-right me-2"></i>Open in Google Maps
              </div>
            </a>
          </div>

          <!-- Notes -->
          <div class="contact-notes" v-if="contact?.notes">
            <label><i class="bi bi-chat-left-text-fill me-2"></i>Notes:</label>
            <p>{{ contact.notes }}</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="contact-modal-footer">
          <button type="button" class="btn btn-primary w-100" @click="handleClose">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Contact Modal Dialog */
.contact-modal-dialog {
  max-width: 550px;
  border-radius: 20px;
}

.contact-modal-content {
  border-radius: 16px;
  border: none;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

/* Contact Modal Header */
.contact-modal-header {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: none;
}

.contact-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0;
}

/* Contact Modal Body */
.contact-modal-body {
  padding: 1.5rem;
  max-height: 60vh;
  overflow-y: auto;
}

.contact-info-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 3px solid #059669;
}

.contact-info-item i {
  font-size: 1.1rem;
  color: #059669;
  min-width: 20px;
  text-align: center;
}

.contact-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  min-width: 100px;
}

.contact-value {
  font-size: 0.875rem;
  color: #1e293b;
  flex: 1;
}

.contact-link {
  color: #3b82f6;
  text-decoration: none;
}

.contact-link:hover {
  text-decoration: underline;
}

/* Map */
.contact-map {
  margin-top: 1rem;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.map-link {
  display: block;
  position: relative;
  text-decoration: none;
}

.map-iframe {
  width: 100%;
  height: 200px;
  border: none;
  display: block;
  pointer-events: none;
}

.map-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  padding: 0.75rem;
  color: white;
  text-align: center;
  font-size: 0.875rem;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.3s;
}

.map-link:hover .map-overlay {
  opacity: 1;
}

/* Notes */
.contact-notes {
  margin-top: 1rem;
  padding: 1rem;
  background: #fef3c7;
  border-radius: 8px;
  border-left: 3px solid #f59e0b;
}

.contact-notes label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 0.5rem;
  display: block;
}

.contact-notes p {
  margin: 0;
  font-size: 0.875rem;
  color: #78350f;
  line-height: 1.5;
}

/* Contact Modal Footer */
.contact-modal-footer {
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

/* Responsive Design for Contact Modal */
@media (max-width: 768px) {
  .contact-modal-body {
    padding: 1rem;
  }

  .contact-label {
    min-width: 80px;
    font-size: 0.8rem;
  }

  .contact-value {
    font-size: 0.8rem;
  }
}
</style>
