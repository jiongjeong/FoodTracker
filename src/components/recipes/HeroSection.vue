<template>
  <div class="compact-hero position-relative py-2 py-md-3">
    <!-- Decorative Blobs -->
    <div class="position-absolute top-0 end-0 h-100 w-50 recipe-blobs pe-none" style="z-index: 0;">
      <div class="blob blob-pink position-absolute top-0 end-0 rounded-circle opacity-75 shadow"></div>
      <div class="blob blob-yellow position-absolute bottom-0 end-0 rounded-circle opacity-75 shadow"></div>
    </div>

    <!-- Floating Ingredients -->
    <div class="floating-ingredient position-absolute fs-3" style="top: 55%; left: 40%; animation-delay: 0s;">🍅</div>
    <div class="floating-ingredient position-absolute fs-4" style="top: 15%; left: 48%; animation-delay: 1s;">🌽</div>
    <div class="floating-ingredient position-absolute fs-5" style="top: 10%; left: 54%; animation-delay: 2s;">🍃</div>
    <div class="floating-ingredient position-absolute fs-5" style="top: 57%; left: 50%; animation-delay: 3s;">🫑</div>

    <div class="row align-items-center g-4 position-relative">
      <!-- Left Content -->
      <div class="col-lg-6 position-relative" style="z-index: 10;">
        <div class="mb-4">
          <h1 class="display-4 fw-bold mb-3 text-dark lh-sm">
            Discover
            <span class="text-success">fresh recipes</span>
          </h1>
          <p class="lead text-muted mb-0">
            to cut waste and boost flavor 🌿
          </p>
        </div>

        <!-- Search Bar -->
        <div class="input-group shadow-sm mb-2 search-bar bg-white">
          <input
            :value="searchQuery"
            @input="$emit('update:searchQuery', $event.target.value)"
            type="text"
            class="form-control border-0 px-4 py-3"
            placeholder="Search recipes (e.g., pasta, chicken, tomato)"
            @keyup.enter="$emit('search')"
          />
          <button class="btn btn-gradient px-4 text-white" @click="$emit('search')">
            <i class="bi bi-arrow-right fs-5"></i>
          </button>
        </div>
        <p class="text-muted small mb-3" style="font-size: 0.8rem;">
          💡 Tip: Search multiple ingredients separated by commas (e.g., "fish, potato, lemon")
        </p>
      </div>

      <!-- Right Content - Food Image -->
      <div class="col-lg-6 position-relative d-none d-lg-flex justify-content-center" style="z-index: 5;">
        <div class="food-plate rounded-circle shadow-lg overflow-hidden d-flex align-items-center justify-content-center bg-dark">
          <img src="/food.jpg" alt="Delicious Salad" class="food-image" />
        </div>
      </div>
    </div>

    <!-- Category Pills -->
    <div class="category-pills d-flex gap-2 overflow-auto pb-2 mt-4 position-relative" style="scrollbar-width: none; -ms-overflow-style: none; z-index: 20;">
      <button
        @click="$emit('update:activeTab', 'search')"
        class="btn rounded-pill flex-shrink-0 px-4 py-2 text-nowrap"
        :class="activeTab === 'search' ? 'btn-success text-white shadow-active' : 'btn-light shadow-soft'">
        See All
      </button>
      <button
        @click="$emit('update:activeTab', 'suggested')"
        class="btn rounded-pill flex-shrink-0 px-4 py-2 text-nowrap"
        :class="activeTab === 'suggested' ? 'btn-success text-white shadow-active' : 'btn-light shadow-soft'">
        <span class="me-2">💡</span>Recommended
      </button>
      <button
        @click="$emit('update:activeTab', 'bookmarked')"
        class="btn rounded-pill flex-shrink-0 px-4 py-2 text-nowrap"
        :class="activeTab === 'bookmarked' ? 'btn-success text-white shadow-active' : 'btn-light shadow-soft'">
        <span class="me-2">❤️</span>Bookmarked
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  searchQuery: String,
  activeTab: String
})

defineEmits(['update:searchQuery', 'update:activeTab', 'search', 'clear-search'])
</script>

<style scoped>
/* Decorative blobs */
.recipe-blobs {
  z-index: 0;
}

.blob {
  width: 280px;
  height: 280px;
}

.blob-pink {
  background: radial-gradient(circle at 30% 30%, #ff8882, #ff6b6b);
  transform: translate(20%, -20%);
}

.blob-yellow {
  width: 220px;
  height: 220px;
  background: radial-gradient(circle at 70% 70%, #ffeaa7, #fdcb6e);
  transform: translate(20%, 20%);
}

/* Floating ingredients animation */
@keyframes riseAndFloat {
  0% {
    transform: translateY(0) scale(0.6);
    opacity: 0;
  }
  20% {
    opacity: 1;
    transform: translateY(-10px) scale(1);
  }
  50% {
    transform: translateY(-20px) scale(1.1);
  }
  80% {
    opacity: 0.8;
    transform: translateY(-30px) scale(1.05);
  }
  100% {
    transform: translateY(-40px) scale(1);
    opacity: 0;
  }
}

.floating-ingredient {
  animation: riseAndFloat 4s ease-in-out infinite;
  pointer-events: none;
  transform-origin: center;
}

/* Search bar */
.search-bar {
  max-width: 480px;
  border-radius: 50px;
  overflow: hidden;
}

.search-bar:focus-within {
  box-shadow: 0 4px 16px rgba(0, 184, 148, 0.2) !important;
  transform: translateY(-1px);
  transition: all 0.3s ease;
}

.btn-gradient {
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
  border-radius: 50px;
}

/* Food plate */
.food-plate {
  width: 280px;
  height: 280px;
  animation: plateRotate 20s linear infinite;
}

.food-image {
  object-fit: cover;
  width: 300px;
  height: 300px;
}

@keyframes plateRotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Category pills shadows */
.shadow-soft {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease-in-out;
}

.shadow-active {
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3), 0 0 4px rgba(34, 197, 94, 0.4);
  transition: all 0.25s ease-in-out;
}

.category-pills .btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Mobile responsive */
@media (max-width: 575px) {
  .recipe-blobs {
    z-index: 0 !important;
    pointer-events: none !important;
  }
  .category-pills .btn {
    position: relative;
    z-index: 30;
  }
}
</style>
