<!-- src/components/MonkeyAvatar.vue -->
<template>
  <img
    :src="imageUrl"
    @error="imageUrl = '/monkeys/fallback.png'"
    :alt="monkeyId"
    class="monkey-img"
  />
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  monkeyId: { type: String, required: true },
  size: { type: String, default: '80px' }
})

const imageUrl = ref('')

const loadImage = () => {
  const url = `/monkey/${props.monkeyId}.png`   // <-- ONLY CHANGE
  console.log('Monkey URL:', url)               // <-- Debug
  imageUrl.value = url
}

const handleError = () => {
  console.warn('Monkey image failed, using fallback')
  imageUrl.value = '/monkey/fallback.png'
}

loadImage()
watch(() => props.monkeyId, loadImage)
</script>

<style scoped>
.monkey-img {
  width: v-bind(size);
  height: v-bind(size);
  object-fit: contain;
  border-radius: 12px;
}
</style>