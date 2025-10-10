<script setup>
import { RouterLink, RouterView } from 'vue-router'
import Navbar from './components/navbar/navbar.vue'

let timer;
const timeout = 15 * 60 * 1000; // 15 minutes

function resetTimeout() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    localStorage.clear();
    window.location.reload();
  }, timeout);
}

['mousemove', 'keydown', 'scroll', 'touchstart'].forEach(event =>
  window.addEventListener(event, resetTimeout)
);

window.addEventListener('beforeunload', () => {
  localStorage.clear();
});


resetTimeout();

</script>

<template>
  <div class="app-container">
    <Navbar />
    <RouterView />
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  overflow-x: hidden;
}

@media (min-width: 992px) {
  .navbar,
  .container-fluid {
    width: 100vw !important;
    max-width: 100vw !important;
    margin: 0 !important;
    left: 0;
    right: 0;
  }
}
</style>
