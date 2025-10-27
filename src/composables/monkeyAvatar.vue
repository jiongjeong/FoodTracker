<template>
  <div class="monkey-avatar" :style="{ width, height }">
    <img :src="baseImg" class="base">
    <img v-for="acc in accessories" :key="acc.id" :src="acc.image" class="accessory">
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '@/firebase';

const props = defineProps({ size: { type: String, default: '120px' } });
const width = props.size;
const height = props.size;

const baseImg = ref('');
const accessories = ref([]);

async function loadMonkey() {
  const uid = auth.currentUser.uid;
  const userSnap = await getDoc(doc(db, 'users', uid));
  const monkey = userSnap.data().monkey;

  // Load base
  baseImg.value = `/monkeys/${monkey.base}.svg`;

  // Load unlocked accessories
  const accSnap = await getDocs(
    query(collection(db, 'accessories'), where('id', 'in', monkey.accessories))
  );
  accessories.value = accSnap.docs.map(d => ({
    id: d.id,
    image: `/monkeys/accessories/${d.data().image}`
  }));
}

onMounted(loadMonkey);
</script>

<style scoped>
.monkey-avatar { position: relative; }
.base { width: 100%; height: 100%; }
.accessory { position: absolute; width: 50%; left: 25%; top: 0; }
</style>