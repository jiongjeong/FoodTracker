<template>
  <div
    :class="['food-card', cardClass, 'd-flex', 'flex-column', 'justify-content-between']"
  >
    <div>
      <div class="food-header">
        <div>
          <div class="food-title-group align-items-center d-flex gap-2">
            <span class="food-name">{{ food.name }}</span>

            <!-- expired badge -->
            <span class="expired-badge" :class="badgeClass">
              <span v-if="daysLeft < 0">Expired</span>
              <span v-else-if="daysLeft == 0">Today</span>
              <span v-else>{{ daysLeft }} days</span>
            </span>
          </div>
          <div class="food-category">{{ food.category }}</div>
          <div class="food-expiry">Expires: {{ formattedDate }}</div>
        </div>
        <div class="food-right">
          <div class="food-price">${{ food.price }}</div>
          <div class="food-quantity">{{ food.quantity }} {{ food.unit }}</div>
          <div v-if="pendingDonationQty > 0" class="pending-donation-info">
            <i class="bi bi-share-fill"></i> {{ pendingDonationQty }} {{ food.unit }} pending donation
          </div>
        </div>
      </div>
    </div>
    <div class="d-flex align-items-end justify-content-between mt-auto w-100">
      <button
        class="food-btn food-btn-recipe px-2 py-1"
        style="font-size: 0.92em; min-width: 0"
        @click.prevent="$emit('go-to-recipes', food)"
      >
        <i class="bi bi-book"></i> Recipes
      </button>
      <div class="food-actions d-flex gap-2">
        <!-- If expired, only show delete. Otherwise allow edit and consume. -->
        <template v-if="daysLeft < 0">
          <button class="food-btn food-btn-delete" @click.prevent="$emit('delete', food)">
            <i class="bi bi-trash"></i>
          </button>
        </template>
        <template v-else>
          <button class="food-btn food-btn-edit" @click.prevent="$emit('edit', food)">
            <i class="bi bi-pencil"></i> Edit
          </button>
          <button class="food-btn food-btn-use" @click.prevent="$emit('use', food)">
            <i class="bi bi-check2"></i> Consume
          </button>
          <button class="food-btn food-btn-delete" @click.prevent="$emit('delete', food)">
            <i class="bi bi-trash"></i>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  food: {
    type: Object,
    required: true
  },
  activities: {
    type: Array,
    default: () => []
  },
  pendingDonationQty: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['edit', 'use', 'delete', 'go-to-recipes'])

// pendingDonationQty is now passed as a prop from the parent component

const getDaysLeft = (food) => {
  const now = new Date()
  let expDate

  if (food.expirationDate) {
    if (typeof food.expirationDate.toDate === 'function') {
      expDate = food.expirationDate.toDate()
    } else if (food.expirationDate instanceof Date) {
      expDate = food.expirationDate
    } else {
      expDate = new Date(food.expirationDate)
    }
  } else {
    return 0
  }

  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const expMidnight = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate())
  return Math.floor((expMidnight - nowMidnight) / (1000 * 60 * 60 * 24))
}

const formatDate = (dateObj) => {
  let date
  if (dateObj) {
    if (typeof dateObj.toDate === 'function') {
      date = dateObj.toDate()
    } else if (dateObj instanceof Date) {
      date = dateObj
    } else {
      date = new Date(dateObj)
    }
  } else {
    return ''
  }

  if (isNaN(date)) return ''

  const day = String(date.getDate()).padStart(2, '0')
  const month = date.toLocaleString('en-US', { month: 'short' })
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

const getFoodCardClass = (food) => {
  const now = new Date()
  let expDate

  if (food.expirationDate) {
    if (typeof food.expirationDate.toDate === 'function') {
      expDate = food.expirationDate.toDate()
    } else if (food.expirationDate instanceof Date) {
      expDate = food.expirationDate
    } else {
      expDate = new Date(food.expirationDate)
    }
  } else {
    return 'normal-card'
  }

  if (isNaN(expDate)) return 'normal-card'

  const daysLeft = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24))

  if (expDate < now) {
    return 'expired-card'
  } else if (daysLeft >= 1 && daysLeft <= 7) {
    return 'warning-card'
  } else {
    return 'normal-card'
  }
}

const getBadgeClass = (food) => {
  const daysLeft = getDaysLeft(food)
  if (daysLeft <= 1) {
    return 'badge-expired'
  } else if (daysLeft <= 7) {
    return 'badge-warning'
  } else {
    return 'badge-transparent'
  }
}

const daysLeft = computed(() => getDaysLeft(props.food))
const formattedDate = computed(() => formatDate(props.food.expirationDate))
const cardClass = computed(() => getFoodCardClass(props.food))
const badgeClass = computed(() => getBadgeClass(props.food))
</script>

<style scoped>
.food-card {
  margin-bottom: 16px;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.expired-card {
  background: #f5dcdc;
}

.warning-card {
  background: #fff9c4;
}

.normal-card {
  background: #fff;
}

.expired-badge {
  border-radius: 6px;
  padding: 2px 10px;
  font-weight: bold;
  transition: background 0.2s, color 0.2s;
}

.badge-expired {
  background: #e53935;
  color: #fff;
}

.badge-warning {
  background-color: #ff9800;
  color: #fff;
}

.badge-transparent {
  background: #ede9e8;
  color: #333;
}

.food-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.food-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.food-name {
  font-size: 1.25rem;
  font-weight: bold;
}

.food-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.food-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 16px;
}

.food-btn {
  border: none;
  background: #f5f5f5;
  color: #333;
  padding: 6px 16px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.2s, color 0.2s;
}

.food-btn-edit {
  background: #e0e0e0;
}

.food-btn-use {
  background: #e8f5e9;
  color: #388e3c;
}

.food-btn-delete {
  background: #ffebee;
  color: #e53935;
}

.food-btn:hover {
  filter: brightness(0.95);
}

.food-price {
  font-size: 1.1rem;
  font-weight: bold;
  margin-left: 12px;
}

.food-category {
  font-size: 0.9rem;
  color: #666;
  margin-top: 4px;
}

.food-expiry {
  font-size: 0.85rem;
  color: #999;
  margin-top: 2px;
}

.food-quantity {
  font-size: 0.95rem;
  color: #555;
}

.pending-donation-info {
  font-size: 0.85rem;
  color: #10b981;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
}

.pending-donation-info i {
  font-size: 0.8rem;
}
</style>
