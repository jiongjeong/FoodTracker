<script setup>
const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  mode: {
    type: String,
    default: 'myShared', // 'myShared' or 'available'
    validator: (value) => ['myShared', 'available'].includes(value)
  }
})

const emit = defineEmits(['edit', 'cancel', 'mark-donated', 'contact'])

const handleEdit = () => {
  emit('edit', props.item)
}

const handleCancel = () => {
  emit('cancel', props.item)
}

const handleMarkDonated = () => {
  emit('mark-donated', props.item)
}

const handleContact = () => {
  emit('contact', props.item)
}
</script>

<template>
  <div class="food-card" :class="{ 'food-card-donated': item.donated }">
    <!-- Status Badge (for my shared items) -->
    <div v-if="mode === 'myShared'" class="position-absolute top-0 end-0 m-3">
      <span class="badge" :class="item.donated ? 'bg-secondary' : 'bg-success'">
        <i :class="item.donated ? 'bi bi-check-circle-fill' : 'bi bi-clock-fill'" class="me-1"></i>
        {{ item.donated ? 'Donated' : 'Active' }}
      </span>
    </div>

    <!-- Distance Badge (for available items) -->
    <div v-if="mode === 'available' && item.distance" class="position-absolute top-0 end-0 m-3">
      <span class="badge bg-info">
        <i class="bi bi-pin-map-fill me-1"></i>
        {{ item.distance }}
      </span>
    </div>

    <!-- Action Buttons (for my shared items) -->
    <div v-if="mode === 'myShared' && !item.donated" class="position-absolute top-0 start-0 m-3 d-flex gap-2">
      <button @click="handleEdit" class="btn btn-light btn-sm rounded-circle" style="width: 36px; height: 36px;">
        <i class="bi bi-pencil-fill"></i>
      </button>
      <button @click="handleCancel" class="btn btn-danger btn-sm rounded-circle" style="width: 36px; height: 36px;">
        <i class="bi bi-trash-fill"></i>
      </button>
    </div>

    <div class="food-card-body">
      <!-- Icon -->
      <div class="food-icon mb-3 mx-auto" 
           :style="mode === 'myShared' 
             ? 'width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 20px; display: flex; align-items: center; justify-content: center;'
             : 'width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 20px; display: flex; align-items: center; justify-content: center;'">
        <i :class="mode === 'myShared' ? 'bi bi-box-seam-fill' : 'bi bi-basket2-fill'" class="text-white fs-1"></i>
      </div>

      <!-- Food Name -->
      <h5 class="fw-bold mb-2 text-center">{{ item.foodName }}</h5>
      
      <!-- Quantity -->
      <p class="text-muted text-center mb-2">
        <i class="bi bi-layers-fill me-1"></i>
        {{ item.quantity }} {{ item.unit }}
      </p>

      <!-- Shared By (for available items) -->
      <p v-if="mode === 'available'" class="text-muted text-center small mb-3">
        <i class="bi bi-person-circle me-1"></i>
        by {{ item.sharedBy || 'Anonymous' }}
      </p>

      <!-- Details -->
      <div class="mb-3">
        <div class="d-flex align-items-center text-muted small mb-2">
          <i class="bi bi-geo-alt-fill me-2"></i>
          <span class="text-truncate">{{ item.location?.address || 'No address' }}</span>
        </div>
        <div class="d-flex align-items-center text-muted small mb-2">
          <i class="bi bi-clock-history me-2"></i>
          <span>{{ item.pickupTime }}</span>
        </div>
        <div v-if="item.notes" class="d-flex align-items-start text-muted small">
          <i class="bi bi-chat-left-text-fill me-2 mt-1"></i>
          <span class="text-truncate">{{ item.notes }}</span>
        </div>
      </div>

      <!-- Expiration Badge -->
      <div class="alert mb-3" :class="{
        'alert-danger': item.daysUntilExpiration <= 2,
        'alert-warning': item.daysUntilExpiration <= 5 && item.daysUntilExpiration > 2,
        'alert-success': item.daysUntilExpiration > 5
      }" style="padding: 8px 12px;">
        <small>
          <i class="bi bi-calendar-x me-1"></i>
          <span v-if="item.donated && mode === 'myShared'">Was expiring in {{ item.daysUntilExpiration }} days</span>
          <span v-else>{{ item.daysUntilExpiration }} day{{ item.daysUntilExpiration !== 1 ? 's' : '' }} left</span>
        </small>
      </div>

      <!-- Action Button -->
      <button v-if="mode === 'myShared' && !item.donated" @click="handleMarkDonated" class="btn btn-success w-100">
        <i class="bi bi-check-circle-fill me-1"></i>
        Mark as Donated
      </button>

      <button v-if="mode === 'available'" @click="handleContact" class="btn btn-primary w-100">
        <i class="bi bi-telephone-fill me-1"></i>
        Contact {{ item.sharedBy?.split(' ')[0] || 'Donor' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.food-card {
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  position: relative;
  height: 100%;
}

.food-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
}

.food-card-donated {
  opacity: 0.7;
}

.food-card-body {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.btn-success,
.btn-primary {
  margin-top: auto;
}
</style>
