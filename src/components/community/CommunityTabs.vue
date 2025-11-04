<script setup>
defineProps({
  activeTab: {
    type: String,
    required: true
  },
  mySharedCount: {
    type: Number,
    default: 0
  },
  availableCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:activeTab'])

const setActiveTab = (tab) => {
  emit('update:activeTab', tab)
}
</script>

<template>
  <div class="container-fluid px-3 px-md-4 mb-4">
    <div class="tabs-container">
      <div class="tabs-nav d-flex gap-3 overflow-auto pb-2" style="scrollbar-width: none; -ms-overflow-style: none;">
        <button
          @click="setActiveTab('myShared')"
          class="tab-button"
          :class="{ 'tab-button-active': activeTab === 'myShared' }"
        >
          <i class="bi bi-share-fill me-2"></i>
          My Shared
          <span v-if="mySharedCount" class="badge bg-primary ms-2">{{ mySharedCount }}</span>
        </button>
        <button
          @click="setActiveTab('available')"
          class="tab-button"
          :class="{ 'tab-button-active': activeTab === 'available' }"
        >
          <i class="bi bi-basket3-fill me-2"></i>
          Available
          <span v-if="availableCount" class="badge bg-success ms-2">{{ availableCount }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tabs-nav::-webkit-scrollbar {
  display: none;
}

.tab-button {
  padding: 12px 24px;
  border: none;
  background: white;
  border-radius: 50px;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.3s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
}

.tab-button:hover {
  background: #f3f4f6;
  color: #198754;
}

.tab-button-active {
  background: #198754 !important;
  color: white !important;
}

.tab-button-active .badge {
  background: white !important;
  color: #198754 !important;
}
</style>
