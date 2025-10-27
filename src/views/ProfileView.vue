<script setup name="ProfileView">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { doc, getDoc, getDocs, updateDoc, deleteDoc, collection, setDoc } from "firebase/firestore";
import { getAuth, updateProfile, updatePassword, deleteUser } from "firebase/auth";
import { db } from "@/firebase";
import MonkeyAvatar from '@/composables/monkeyAvatar.vue'

const router = useRouter()
const auth = getAuth()
const user = ref(auth.currentUser)
const editableUser = ref({
  name: '',
  contactNo: '',
  handle: ''
})

const displayEmail = ref('')

const originalUser = ref({
  name: '',
  contactNo: '',
  handle: ''
})

const passwords = ref({
  current: '',
  new: '',
  confirm: ''
})

const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const showDeleteModal = ref(false)

// Check if there are any changes
const hasChanges = computed(() => {
  const profileChanged =
    editableUser.value.name !== originalUser.value.name ||
    editableUser.value.contactNo !== originalUser.value.contactNo ||
    editableUser.value.handle !== originalUser.value.handle

  const passwordChanged = passwords.value.new !== ''

  return profileChanged || passwordChanged
})

async function loadUser() {
  loading.value = true
  auth.onAuthStateChanged(async (u) => {
    user.value = u
    if (u) {
      displayEmail.value = u.email || ''
      const userDoc = await getDoc(doc(db, "user", u.uid))
      if (userDoc.exists()) {
        const profile = userDoc.data()
        const userData = {
          name: profile.name || u.displayName || '',
          contactNo: profile.contactNo || '',
          handle: profile.handle || ''
        }
        editableUser.value = { ...userData }
        originalUser.value = { ...userData }
      } else {
        // Fallback if Firestore document doesn't exist
        const userData = {
          name: u.displayName || '',
          contactNo: '',
          handle: ''
        }
        editableUser.value = { ...userData }
        originalUser.value = { ...userData }
      }
    }
    loading.value = false
  })
}

async function saveChanges() {
  if (!user.value) {
    errorMessage.value = 'User not found.'
    return
  }

  if (passwords.value.new && passwords.value.new !== passwords.value.confirm) {
    errorMessage.value = 'New password and confirmation do not match.'
    return
  }

  if (passwords.value.new && passwords.value.new.length < 6) {
    errorMessage.value = 'Password must be at least 6 characters.'
    return
  }

  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    // Check if user document exists
    const userDocRef = doc(db, "user", user.value.uid)
    const userDoc = await getDoc(userDocRef)

    const userData = {
      name: editableUser.value.name,
      email: user.value.email, // Keep original email
      contactNo: editableUser.value.contactNo,
      handle: editableUser.value.handle
    }

    if (userDoc.exists()) {
      // Update existing document
      await updateDoc(userDocRef, userData)
    } else {
      // Create new document with setDoc
      await setDoc(userDocRef, {
        ...userData,
        points: 0,
        createdAt: new Date().toISOString()
      })
    }

    // Update display name
    await updateProfile(user.value, { displayName: editableUser.value.name })

    // Update password if provided
    if (passwords.value.new) {
      try {
        await updatePassword(user.value, passwords.value.new)
      } catch (passwordError) {
        if (passwordError.code === 'auth/requires-recent-login') {
          errorMessage.value = 'For security, please log out and log back in before changing your password.'
        } else {
          errorMessage.value = 'Failed to update password: ' + passwordError.message
        }
        saving.value = false
        return
      }
    }

    passwords.value.current = ''
    passwords.value.new = ''
    passwords.value.confirm = ''

    successMessage.value = 'Profile updated successfully!'

    setTimeout(() => {
      window.location.reload()
    }, 1500)
  } catch (error) {
    console.error('Error updating profile:', error)
    switch (error.code) {
      case 'auth/requires-recent-login':
        errorMessage.value = 'Please log out and log back in before changing your password.'
        break
      default:
        errorMessage.value = 'Error updating profile: ' + error.message
    }
  } finally {
    saving.value = false
  }
}

async function deleteCollection(collectionRef) {
  const snapshot = await getDocs(collectionRef);
  const promises = [];
  snapshot.forEach((docItem) => {
    promises.push(deleteDoc(doc(collectionRef, docItem.id)));
  });
  await Promise.all(promises);
}

async function confirmDelete() {
  showDeleteModal.value = true
}

async function deleteAccount() {
  if (!user.value) {
    errorMessage.value = "User not found."
    return
  }

  try {
    const userDocRef = doc(db, "user", user.value.uid);

    const subcollections = ["foodItems", "activities", "recipes"];
    for (const subcol of subcollections) {
      const subcolRef = collection(userDocRef, subcol);
      await deleteCollection(subcolRef);
    }

    await deleteDoc(userDocRef);
    await deleteUser(user.value);

    localStorage.clear()
    sessionStorage.clear()

    router.push("/signup");
  } catch (error) {
    errorMessage.value = "Error deleting account: " + error.message
    showDeleteModal.value = false
  }
}

onMounted(() => {
  loadUser()
})

const allAccessories = ref([])
const unlockedCount = ref(0)
const totalAccessories = ref(0)

// Load accessories + count unlocked
async function loadAccessories() {
  const snap = await getDocs(collection(db, 'accessories'))
  allAccessories.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  totalAccessories.value = allAccessories.value.length

  // Count unlocked from current user
  const userSnap = await getDoc(doc(db, 'users', currentUser.value.uid))
  const monkey = userSnap.data()?.monkey || { accessories: [] }
  unlockedCount.value = monkey.accessories.length
}

onMounted(() => {
  if (currentUser.value) loadAccessories()
})

function isUnlocked(acc) {
  const userSnap = /* get from your existing user data or use a ref */
  const monkey = userData.value?.monkey || { accessories: [] }
  return monkey.accessories.includes(acc.id)
}

</script>

<template>
  <div class="profile-wrapper">
    <div class="profile-container">
      <!-- Header Section -->
      <div class="profile-header">
        <div class="avatar-section">
          <div class="avatar">
            <i class="bi bi-person-fill"></i>
          </div>
          <h2 class="profile-title">{{ editableUser.name || 'User Profile' }}</h2>
          <p class="profile-subtitle">Manage your account settings</p>
        </div>
      </div>

      <!-- monkey avatar -->
      <div class="monkey-section text-center mb-4">
        <MonkeyAvatar size="150px" class="mx-auto shadow-lg rounded-circle" />
        <h4 class="mt-3 mb-1">Your Food Monkey</h4>
        <p class="text-muted small">Earn points to dress it up!</p>
      </div>

      <div class="form-section monkey-shop">
        <h3 class="section-title">
          <i class="bi bi-stars"></i>
          Monkey Wardrobe
          <span class="badge bg-success ms-2">{{ unlockedCount }} / {{ totalAccessories }}</span>
        </h3>

        <div class="accessory-grid">
          <div
            v-for="acc in allAccessories"
            :key="acc.id"
            class="accessory-item"
            :class="{ locked: !isUnlocked(acc) }"
          >
            <div class="accessory-image-wrapper">
              <img :src="acc.image" :alt="acc.name" />
              <div v-if="!isUnlocked(acc)" class="lock-overlay">
                <i class="bi bi-lock-fill"></i>
              </div>
            </div>
            <p class="accessory-name">{{ acc.name }}</p>
            <small v-if="!isUnlocked(acc)" class="text-muted">
              Need {{ acc.requiredScore }} pts
            </small>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <span class="spinner-border spinner-border-lg" role="status"></span>
        <p>Loading profile...</p>
      </div>

      <!-- Profile Form -->
      <form v-else @submit.prevent="saveChanges" class="profile-form">
        <!-- Personal Information Section -->
        <div class="form-section">
          <h3 class="section-title">
            <i class="bi bi-person-badge-fill"></i>
            Personal Information
          </h3>

          <div class="form-group">
            <label for="name">
              <i class="bi bi-person-fill"></i>
              Name
            </label>
            <input
              id="name"
              v-model="editableUser.name"
              type="text"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div class="form-group">
            <label for="email">
              <i class="bi bi-envelope-fill"></i>
              Email Address
            </label>
            <input
              id="email"
              :value="displayEmail"
              type="email"
              placeholder="Email address"
              disabled
              readonly
            />
            <small class="email-hint">Email cannot be changed</small>
          </div>

          <div class="form-group">
            <label for="contactNo">
              <i class="bi bi-telephone-fill"></i>
              Contact Number
            </label>
            <input
              id="contactNo"
              v-model="editableUser.contactNo"
              type="tel"
              placeholder="Enter contact number"
            />
          </div>

          <div class="form-group">
            <label for="handle">
              <i class="bi bi-telegram"></i>
              Telegram Handle
            </label>
            <input
              id="handle"
              v-model="editableUser.handle"
              type="text"
              placeholder="@username"
            />
          </div>
        </div>

        <!-- Password Section -->
        <div class="form-section">
          <h3 class="section-title">
            <i class="bi bi-shield-lock-fill"></i>
            Change Password
          </h3>

          <div class="form-group">
            <label for="newPassword">
              <i class="bi bi-lock-fill"></i>
              New Password
            </label>
            <div class="password-input-wrapper">
              <input
                id="newPassword"
                v-model="passwords.new"
                :type="showNewPassword ? 'text' : 'password'"
                placeholder="Enter new password (optional)"
              />
              <button
                type="button"
                class="toggle-password"
                @click="showNewPassword = !showNewPassword"
                tabindex="-1"
              >
                <i :class="showNewPassword ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill'"></i>
              </button>
            </div>
            <small class="password-hint">Leave blank to keep current password</small>
          </div>

          <div class="form-group">
            <label for="confirmPassword">
              <i class="bi bi-lock-check-fill"></i>
              Confirm New Password
            </label>
            <div class="password-input-wrapper">
              <input
                id="confirmPassword"
                v-model="passwords.confirm"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                class="toggle-password"
                @click="showConfirmPassword = !showConfirmPassword"
                tabindex="-1"
              >
                <i :class="showConfirmPassword ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill'"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Messages -->
        <div v-if="errorMessage" class="error-message">
          <i class="bi bi-exclamation-circle-fill"></i>
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="success-message">
          <i class="bi bi-check-circle-fill"></i>
          {{ successMessage }}
        </div>

        <!-- Action Buttons -->
        <div class="button-group">
          <button type="submit" class="btn-save" :disabled="saving || !hasChanges">
            <i class="bi bi-check-circle-fill"></i>
            <span v-if="!saving">Save Changes</span>
            <span v-else class="spinner-border spinner-border-sm" role="status"></span>
          </button>

          <button type="button" class="btn-delete" @click="confirmDelete">
            <i class="bi bi-trash-fill"></i>
            Delete Account
          </button>
        </div>
      </form>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal fade show d-block" tabindex="-1">
      <div class="modal-backdrop fade show" @click="showDeleteModal = false"></div>
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-exclamation-triangle-fill text-danger"></i>
              Confirm Account Deletion
            </h5>
            <button type="button" class="btn-close" @click="showDeleteModal = false" aria-label="Close">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-body">
            <p><strong>Are you sure you want to delete your account?</strong></p>
            <p class="text-muted mb-0">This action is irreversible. All your data including:</p>
            <ul class="text-muted">
              <li>Food items</li>
              <li>Activities</li>
              <li>Saved recipes</li>
              <li>Profile information</li>
            </ul>
            <p class="text-danger mb-0"><strong>will be permanently deleted.</strong></p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showDeleteModal = false">
              Cancel
            </button>
            <button type="button" class="btn btn-danger" @click="deleteAccount">
              <i class="bi bi-trash-fill"></i>
              Yes, Delete My Account
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


