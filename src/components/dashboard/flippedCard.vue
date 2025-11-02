<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  iconClass: { type: String, default: 'bi bi-info-circle' },
  gradient: { type: String, required: true },
  height: { type: String, default: '130px' },
  flipped: { type: Boolean, default: undefined }, // allows external control
})

const emit = defineEmits(['update:flipped'])
const internalFlipped = ref(false)

const isControlled = computed(() => props.flipped !== undefined)
const isFlipped = computed({
  get: () => (isControlled.value ? props.flipped : internalFlipped.value),
  set: (val) => {
    if (isControlled.value) emit('update:flipped', val)
    else internalFlipped.value = val
  },
})

const toggle = () => (isFlipped.value = !isFlipped.value)
</script>

<template>
  <div class="flip-card" :style="{ height }" @click="toggle">
    <div class="flip-card-inner" :class="{ 'is-flipped': isFlipped }">
      <!-- FRONT -->
      <div
        class="flip-card-front position-relative p-3 rounded-4 text-white shadow d-flex flex-column justify-content-between"
        :style="{
          background: gradient,
          boxShadow: '0 6px 14px rgba(0, 0, 0, 0.1)',
          height
        }"
      >
        <!-- Left: Icon + label -->
        <div
          class="position-absolute top-50 start-0 translate-middle-y ms-3 d-flex flex-column align-items-center"
          style="width: 90px"
        >
          <div
            class="rounded-circle bg-white bg-opacity-25 d-flex justify-content-center align-items-center mb-1 p-2"
            style="width: 56px; height: 56px"
          >
            <i :class="iconClass" class="fs-5 text-white"></i>
          </div>
          <small class="text-white text-center">{{ title }}</small>
        </div>

        <!-- Right: FRONT content -->
        <div class="text-end align-self-end pe-2 mt-2 position-relative" >
          <!-- Default slot becomes the FRONT right content (e.g., numbers, badges) -->
          <slot />
        </div>

        <!-- Front info icon -->
        <i class="bi bi-info-circle position-absolute top-0 start-0 m-2 text-white opacity-75"
           style="font-size: 0.875rem;"></i>
      </div>

      <!-- BACK -->
      <div
        class="flip-card-back position-absolute p-3 rounded-4 text-white shadow d-flex flex-column justify-content-between"
        :style="{
          background: gradient,
          boxShadow: '0 6px 14px rgba(0, 0, 0, 0.1)',
          height: '130px'
        }"
      >
        <!-- Left: Icon + label -->
        <div
          class="position-absolute top-50 start-0 translate-middle-y ms-3 d-flex flex-column align-items-center"
          style="width: 90px"
        >
          <div
            class="rounded-circle bg-white bg-opacity-25 d-flex justify-content-center align-items-center mb-1 p-2"
            style="width: 56px; height: 56px"
          >
            <i class="bi bi-info-circle fs-5 text-white"></i>
          </div>
          <small class="text-white text-center">{{ title }}</small>
        </div>

        <!-- Right: BACK content -->
        <div class="text-end align-self-end pe-2 position-relative" style="max-width: 55%;">
          <!-- Named slot 'back' for the back content -->
          <slot name="back" />
        </div>

        <!-- Back return icon -->
        <i class="bi bi-arrow-left-circle position-absolute top-0 start-0 m-2 text-white opacity-75"
           style="font-size: 0.875rem;"></i>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Reuse your flip styles to keep the exact look/feel */
.flip-card-front,
.flip-card-back {
  position: absolute;
  height: 100%;
  top: 0;
  left: 0;
  backface-visibility: hidden;
}

.flip-card {
  cursor: pointer;
  width: 100%;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.flip-card-inner.is-flipped {
  transform: rotateY(180deg);
}

.flip-card-back {
  transform: rotateY(180deg);
}
</style>
