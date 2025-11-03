<template>
  <nav class="navbar navbar-expand-md navbar-light bg-white border-bottom fixed-top shadow-sm">
    <div class="container-fluid">
      <!-- Brand -->
      <RouterLink
        to="/dashboard"
        class="navbar-brand fw-bold title text-decoration-none d-flex align-items-center"
        exact-active-class="active"
        @click="closeNavbar"
      >
        <img src="/bigbackicon.jpg" alt="Logo" class="logo-img me-2 rounded-circle" />
        BigBacks
      </RouterLink>

      <!-- Mobile controls (hamburger + profile icon) - only visible on small screens -->
      <div class="d-flex d-md-none align-items-center gap-2">
        <!-- Profile icon button for mobile -->
        <button
          v-if="userName"
          class="btn btn-link p-0 profile-icon-btn"
          type="button"
          @click.stop="toggleDropdown($event)"
          aria-label="Profile menu"
        >
          <span class="initials-avatar-mobile">{{ userInitials }}</span>
        </button>

        <!-- Hamburger button -->
        <button
          class="navbar-toggler border-0 p-2"
          type="button"
          @click="toggleNavbar"
          aria-controls="navbarNav"
          :aria-expanded="navbarOpen.toString()"
          aria-label="Toggle navigation"
        >
          <span class="hamburger-icon" :class="{ open: navbarOpen }">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      </div>

      <!-- Collapsible navbar content -->
      <div class="navbar-collapse collapse" :class="{ show: navbarOpen }" id="navbarNav">
        <div class="d-flex align-items-center w-100">
          <ul class="navbar-nav d-flex flex-column flex-md-row justify-content-center align-items-center flex-grow-1">
            <li class="nav-item">
              <RouterLink
                to="/dashboard"
                class="nav-link"
                exact-active-class="active"
                @click="closeNavbar"
              >
                <i class="bi bi-house-door me-2"></i>Dashboard
              </RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink
                to="/recipes"
                class="nav-link"
                exact-active-class="active"
                @click="closeNavbar"
              >
                <i class="bi bi-egg-fried me-2"></i>Recipes
              </RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink
                to="/chatbot"
                class="nav-link"
                exact-active-class="active"
                @click="closeNavbar"
              >
                <i class="bi bi-robot me-2"></i>Learn More
              </RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink
                to="/community"
                class="nav-link"
                exact-active-class="active"
                @click="closeNavbar"
              >
                <i class="bi bi-people me-2"></i>Community
              </RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink
                to="/village"
                class="nav-link"
                exact-active-class="active"
                @click="closeNavbar"
              >
                <i class="bi bi-trophy me-2"></i>BigBacksVille
              </RouterLink>
            </li>
          </ul>

          <!-- Desktop user section (hidden on mobile) -->
          <ul class="navbar-nav ms-auto flex-shrink-0 d-none d-md-flex">
            <li class="nav-item dropdown" v-if="userName" ref="dropdownRef">
              <a
                class="nav-link dropdown-toggle"
                href="#"
                role="button"
                @click.prevent="toggleDropdown($event)"
                :class="{ show: dropdownOpen }"
                aria-haspopup="true"
                :aria-expanded="dropdownOpen.toString()"
              >
                <span class="initials-avatar">{{ userInitials }}</span>{{ userName }}
              </a>
              <ul class="dropdown-menu dropdown-menu-end" :class="{ show: dropdownOpen }">
                <li>
                  <RouterLink to="/profile" class="dropdown-item" @click="closeNavbar">
                    <i class="bi bi-person me-2"></i>My Profile
                  </RouterLink>
                </li>
                <li>
                  <a class="dropdown-item text-danger" href="#" @click.prevent="logout">
                    <i class="bi bi-box-arrow-right me-2"></i>Logout
                  </a>
                </li>
              </ul>
            </li>
            <li class="nav-item" v-else>
              <RouterLink to="/login" class="nav-link" exact-active-class="active" @click="closeNavbar">
                <i class="bi bi-person-plus me-1"></i>Login/Sign Up
              </RouterLink>
            </li>
          </ul>
        </div>
      </div>

      <!-- Mobile profile dropdown (positioned below profile icon) -->
      <div
        v-if="userName"
        class="mobile-profile-dropdown d-md-none"
        :class="{ show: dropdownOpen }"
        ref="mobileDropdownRef"
      >
        <RouterLink to="/profile" class="mobile-dropdown-item" @click="closeNavbar">
          <i class="bi bi-person me-2"></i>My Profile
        </RouterLink>
        <a class="mobile-dropdown-item text-danger" href="#" @click.prevent="logout">
          <i class="bi bi-box-arrow-right me-2"></i>Logout
        </a>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { getAuth, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAlert } from '@/composables/useAlert'

const { error } = useAlert()

const $route = useRoute()
const router = useRouter()

const dropdownOpen = ref(false)
const navbarOpen = ref(false)

const dropdownRef = ref(null)
const mobileDropdownRef = ref(null)

function handleOutsideClick(e) {
  // if dropdown is not open, nothing to do
  if (!dropdownOpen.value) return
  // if click is inside the desktop or mobile dropdown, ignore
  const desktopEl = dropdownRef.value
  const mobileEl = mobileDropdownRef.value
  if ((desktopEl && desktopEl.contains(e.target)) ||
      (mobileEl && mobileEl.contains(e.target))) {
    return
  }
  dropdownOpen.value = false
}

// Auth and user state
const auth = getAuth()
const user = ref(auth.currentUser)
const userName = ref('')

let unsubscribeAuth = null

// Register auth listener once and clean up on unmount
function authListener() {
  unsubscribeAuth = auth.onAuthStateChanged(async (u) => {
    user.value = u
    userName.value = ''
    if (u) {
      try {
        const userDocRef = doc(db, 'user', u.uid) // Corrected collection name to 'users'
        const userDocSnap = await getDoc(userDocRef)
        if (userDocSnap.exists()) {
          userName.value = userDocSnap.data().name
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error)
      }
    }
  })
}
authListener()

onUnmounted(() => {
  if (unsubscribeAuth) unsubscribeAuth()
  document.removeEventListener('click', handleOutsideClick)
})

// Close navbar and dropdown on route change
watch($route, () => {
  closeNavbar()
})

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})

function toggleNavbar() {
  navbarOpen.value = !navbarOpen.value
}
function closeNavbar() {
  navbarOpen.value = false
  dropdownOpen.value = false
}
function toggleDropdown(evt) {
  // prevent the document click handler from immediately closing the dropdown
  if (evt && typeof evt.stopPropagation === 'function') evt.stopPropagation()
  dropdownOpen.value = !dropdownOpen.value
}
async function logout() {
  try {
    await signOut(auth)
    localStorage.removeItem('user')
    sessionStorage.removeItem('user')
    window.dispatchEvent(new Event('userChange'))
    router.push('/login')
  } catch (err) {
    console.error('Logout error:', err)
    await error('Error logging out: ' + err.message)
  }
}
const userInitials = computed(() => {
  if (!userName.value) return 'U'
  const parts = userName.value.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  } else if (parts[0]) {
    return parts[0][0].toUpperCase()
  }
  return 'U'
})
</script>

<style scoped>
/* Navbar height variable for body padding */
:root {
  --navbar-height: 56px;
}

/* Logo sizing */
.logo-img {
  height: 36px;
  width: 36px;
  object-fit: cover;
}

/* Navbar brand responsive font */
.navbar-brand {
  font-size: clamp(1.1rem, 2.5vw, 1.35rem);
}

.title {
  color: #059669;
}

/* Custom hamburger icon with animation */
.hamburger-icon {
  display: inline-block;
  width: 24px;
  height: 20px;
  position: relative;
  cursor: pointer;
}

.hamburger-icon span {
  display: block;
  position: absolute;
  height: 2.5px;
  width: 100%;
  background: #059669;
  border-radius: 3px;
  opacity: 1;
  left: 0;
  transform: rotate(0deg);
  transition: 0.25s ease-in-out;
}

.hamburger-icon span:nth-child(1) {
  top: 0px;
}

.hamburger-icon span:nth-child(2) {
  top: 8.5px;
}

.hamburger-icon span:nth-child(3) {
  top: 17px;
}

.hamburger-icon.open span:nth-child(1) {
  top: 8.5px;
  transform: rotate(135deg);
}

.hamburger-icon.open span:nth-child(2) {
  opacity: 0;
  left: -30px;
}

.hamburger-icon.open span:nth-child(3) {
  top: 8.5px;
  transform: rotate(-135deg);
}

/* Mobile profile icon button */
.profile-icon-btn {
  text-decoration: none;
  transition: transform 0.2s ease;
}

.profile-icon-btn:hover,
.profile-icon-btn:focus {
  transform: scale(1.05);
}

.initials-avatar-mobile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #059669;
  color: #fff;
  font-weight: 700;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  font-size: 0.9rem;
  line-height: 1;
  user-select: none;
  transition: background 0.2s ease;
}

.profile-icon-btn:hover .initials-avatar-mobile {
  background: #047857;
}

/* Mobile menu overlay with smooth slide animation */
@media (max-width: 767.98px) {
  .navbar-collapse {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    background: linear-gradient(135deg, #ffffff 0%, #f8fffe 100%);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
    border-radius: 0 0 12px 12px;
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transform: translateY(-10px);
    transition: max-height 0.35s ease, opacity 0.3s ease, transform 0.3s ease;
  }

  .navbar-collapse.show {
    max-height: 500px;
    opacity: 1;
    transform: translateY(0);
    padding: 1rem 0;
  }

  /* Nav items spacing and hover in mobile */
  .navbar-nav .nav-item {
    width: 100%;
    padding: 0.25rem 0;
  }

  .navbar-nav .nav-link {
    padding: 0.875rem 1.5rem;
    border-radius: 8px;
    margin: 0 1rem;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    font-weight: 500;
  }

  .navbar-nav .nav-link:hover {
    background: rgba(5, 150, 105, 0.08);
    transform: translateX(4px);
  }

  .navbar-nav .nav-link i {
    font-size: 1.15rem;
  }
}

/* Mobile profile dropdown - positioned below the profile icon */
.mobile-profile-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  min-width: 180px;
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
  pointer-events: none;
  transition: opacity 0.25s ease, transform 0.25s ease;
  margin-top: 0.5rem;
  margin-right: 0.75rem;
  z-index: 1050;
}

.mobile-profile-dropdown.show {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.mobile-dropdown-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  color: #1f2937;
  text-decoration: none;
  font-weight: 500;
  transition: background 0.2s ease;
  border-radius: 6px;
  margin: 0.25rem 0.5rem;
}

.mobile-dropdown-item:first-child {
  margin-top: 0.5rem;
}

.mobile-dropdown-item:last-child {
  margin-bottom: 0.5rem;
}

.mobile-dropdown-item:hover {
  background: rgba(5, 150, 105, 0.08);
}

.mobile-dropdown-item.text-danger {
  color: #dc3545;
}

.mobile-dropdown-item.text-danger:hover {
  background: rgba(220, 53, 69, 0.08);
}

/* Nav link responsive font and spacing */
.nav-link {
  font-size: clamp(0.9rem, 1.8vw, 1.12rem);
  white-space: nowrap;
  transition: all 0.2s ease;
}

@media (min-width: 768px) and (max-width: 991.98px) {
  .nav-link {
    font-size: clamp(0.82rem, 1.4vw, 0.92rem);
    padding-left: 0.625rem;
    padding-right: 0.625rem;
  }
}

@media (min-width: 992px) {
  .nav-link {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

/* Active link styling (enhance Bootstrap) */
.nav-link.active {
  background: linear-gradient(135deg, #e0f5ef 0%, #d1f0e6 100%);
  border-radius: 0.5rem;
  color: #047857;
  font-weight: 600;
}

/* Desktop nav link hover */
@media (min-width: 768px) {
  .nav-link:hover:not(.active) {
    background: rgba(5, 150, 105, 0.05);
    border-radius: 0.5rem;
  }
}

/* User avatar (desktop) */
.initials-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #059669;
  color: #fff;
  font-weight: 700;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  font-size: clamp(0.9rem, 1.6vw, 1.05rem);
  margin-right: 0.5rem;
  vertical-align: middle;
  line-height: 1;
  user-select: none;
  transition: background 0.2s ease;
}

.dropdown-toggle:hover .initials-avatar {
  background: #047857;
}

/* Smooth dropdown animation */
.dropdown-menu {
  border: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  padding: 0.5rem;
  margin-top: 0.5rem !important;
  animation: dropdownSlideIn 0.25s ease;
}

@keyframes dropdownSlideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-item {
  border-radius: 6px;
  padding: 0.625rem 0.875rem;
  font-weight: 500;
  transition: background 0.2s ease;
}

.dropdown-item:hover {
  background: rgba(5, 150, 105, 0.08);
}

.dropdown-item.text-danger:hover {
  background: rgba(220, 53, 69, 0.08);
}
</style>
