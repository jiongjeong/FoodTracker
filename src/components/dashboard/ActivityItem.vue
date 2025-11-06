<template>
  <div class="activity-item">
    <div class="d-flex align-items-start gap-3 position-relative">
      <!-- Points Badge -->
      <div
        v-if="activity.pointsEarned !== undefined && activity.pointsEarned !== 0"
        class="position-absolute top-0 end-0"
      >
        <span
          class="badge d-flex align-items-center gap-1"
          :class="activity.pointsEarned > 0 ? 'bg-success' : 'bg-danger'"
          style="font-size: 0.7rem;"
        >
          <i :class="activity.pointsEarned > 0 ? 'bi bi-arrow-up' : 'bi bi-arrow-down'"></i>
          {{ Math.abs(activity.pointsEarned) }} pts
        </span>
      </div>

      <!-- Icon Circle -->
      <div class="flex-shrink-0">
        <div
          class="rounded-circle d-flex align-items-center justify-content-center"
          :style="{
            width: '48px',
            height: '48px',
            background: gradient
          }"
        >
          <i :class="icon" class="text-white fs-5"></i>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-grow-1 min-w-0">
        <h6 class="mb-1 fw-bold small">{{ title }}</h6>

        <!-- Activity Details -->
        <div v-if="activity.activityType === 'donFood'" class="mb-1">
          <p class="mb-0 small text-secondary">
            {{ activity.quantity }} {{ activity.unit }} of {{ activity.foodName }} donated
          </p>
        </div>

        <div v-else-if="activity.activityType === 'pendingDonFood'" class="mb-1">
          <p class="mb-0 small text-secondary">
            {{ activity.quantity }} {{ activity.unit }} of {{ activity.foodName }} pending donation
          </p>
        </div>

        <div v-else-if="activity.activityType === 'addFood'" class="mb-1">
          <p class="mb-0 small text-secondary">
            {{ activity.quantity }} {{ activity.unit }} of {{ activity.foodName }} added
          </p>
        </div>

        <div v-else-if="activity.activityType === 'conFood'" class="mb-1">
          <p
            class="mb-0 small"
            :class="activity.note === 'fully consumed' ? 'text-success fw-semibold' : 'text-secondary'"
          >
            <span v-if="activity.note === 'fully consumed'">
              All of {{ activity.foodName }} fully consumed
            </span>
            <span v-else>
              {{ activity.quantity }} {{ activity.unit }} of {{ activity.foodName }} consumed
            </span>
          </p>
        </div>

        <div v-else-if="activity.activityType === 'expFood'" class="mb-1">
          <p class="mb-0 small text-danger fw-semibold">
            {{ activity.quantity }} {{ activity.unit }} of {{ activity.foodName }} expired
          </p>
        </div>

        <!-- Timestamp -->
        <small class="text-muted d-block" style="font-size: 0.75rem;">
          <i class="bi bi-clock me-1"></i>{{ relativeTime }}
        </small>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  activity: {
    type: Object,
    required: true
  }
})

const getActivityIcon = (type) => {
  const icons = {
    donFood: 'bi bi-heart-fill',
    pendingDonFood: 'bi bi-clock-history',
    addFood: 'bi bi-plus-circle-fill',
    conFood: 'bi bi-check-circle-fill',
    expFood: 'bi bi-x-circle-fill'
  }
  return icons[type] || 'bi bi-circle-fill'
}

const getActivityTitle = (type) => {
  const titles = {
    donFood: 'Food Donated',
    pendingDonFood: 'Donation Pending',
    addFood: 'Food Added',
    conFood: 'Food Consumed',
    expFood: 'Food Expired'
  }
  return titles[type] || 'Activity'
}

const getActivityGradient = (type) => {
  const gradients = {
    donFood: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    pendingDonFood: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    addFood: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    conFood: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    expFood: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
  }
  return gradients[type] || 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
}

const getRelativeTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

const icon = computed(() => getActivityIcon(props.activity.activityType))
const title = computed(() => getActivityTitle(props.activity.activityType))
const gradient = computed(() => getActivityGradient(props.activity.activityType))
const relativeTime = computed(() => getRelativeTime(props.activity.createdAt))
</script>

<style scoped>
.activity-item {
  padding: 12px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #f1f5f9;
  transition: all 0.2s ease;
  animation: slideIn 0.3s ease-out;
}

.activity-item:hover {
  background: #f8fafc;
  border-color: #e2e8f0;
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
