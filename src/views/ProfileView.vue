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

// function isUnlocked(acc) {
//   const userSnap = /* get from your existing user data or use a ref */
//   const monkey = userData.value?.monkey || { accessories: [] }
//   return monkey.accessories.includes(acc.id)
// }

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

<style scoped>
/* Profile Page Specific Styles */
.profile-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--auth-gradient);
  padding: 2rem 1rem;
}

.profile-container {
  max-width: 700px;
  width: 100%;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  animation: slideUp 0.4s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.profile-header {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  padding: 2.5rem 2rem;
  text-align: center;
  color: white;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar {
  width: 100px;
  height: 100px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  border: 4px solid rgba(255, 255, 255, 0.3);
}

.avatar i {
  font-size: 3rem;
  color: white;
}

.profile-title {
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  color: white;
}

.profile-subtitle {
  font-size: 0.95rem;
  margin: 0;
  color: rgba(255, 255, 255, 0.9);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 1rem;
  color: #6b7280;
}

.spinner-border-lg {
  width: 3rem;
  height: 3rem;
  border-width: 0.3rem;
  color: #059669;
}

.profile-form {
  padding: 2rem;
  margin-bottom: 1.5rem;
}

.form-section {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.form-section:last-of-type {
  border-bottom: none;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1.5rem;
}

.section-title i {
  color: #059669;
  font-size: 1.4rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

label i {
  color: #059669;
}

input[type="email"],
input[type="password"],
input[type="text"],
input[type="tel"] {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border-radius: 8px;
  border: 2px solid #e5e7eb;
  box-sizing: border-box;
  transition: all 0.2s ease;
  font-family: inherit;
}

input:focus {
  outline: none;
  border-color: #059669;
  box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
}

input:disabled,
input:readonly {
  background: #f9fafb;
  cursor: not-allowed;
  opacity: 0.7;
  color: #6b7280;
}

.password-input-wrapper {
  position: relative;
}

.password-input-wrapper input {
  padding-right: 3rem;
}

.toggle-password {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  width: auto;
  margin: 0;
}

.toggle-password:hover {
  color: #059669;
  background: transparent;
}

.toggle-password i {
  font-size: 1.1rem;
}

.password-hint,
.email-hint {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #6b7280;
  font-style: italic;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 1rem;
  animation: shake 0.4s ease;
}

.error-message i {
  font-size: 1.1rem;
  flex-shrink: 0;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.success-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  color: #059669;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 1rem;
  animation: slideDown 0.4s ease;
}

.success-message i {
  font-size: 1.1rem;
  flex-shrink: 0;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.button-group {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-save,
.btn-delete {
  flex: 1;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-save {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
}

.btn-save:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(5, 150, 105, 0.4);
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
}

.btn-save:active:not(:disabled) {
  transform: translateY(0);
}

.btn-save:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-delete {
  background: white;
  color: #dc2626;
  border: 2px solid #dc2626;
}

.btn-delete:hover {
  background: #dc2626;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(220, 38, 38, 0.3);
}

/* Modal Styles */
.modal {
  position: fixed !important;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  overflow-y: auto;
}

.modal-backdrop {
  position: fixed !important;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9998;
}

.modal-dialog {
  position: relative;
  max-width: 500px;
  width: 90%;
  margin: 1rem auto;
  z-index: 10000;
  pointer-events: auto;
}

.modal-content {
  position: relative;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-close {
  background: transparent;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
  font-size: 1.25rem;
  line-height: 1;
}

.btn-close:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.modal-body {
  padding: 1.5rem;
}

.modal-body ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.modal-body p {
  margin-bottom: 0.75rem;
}

.text-muted {
  color: #6b7280;
}

.text-danger {
  color: #dc2626;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover {
  background: #b91c1c;
}

/* Responsive Design */
@media (max-width: 768px) {
  .profile-wrapper {
    padding: 1rem 0.5rem;
  }

  .profile-container {
    padding: 2rem 1.5rem;
    border-radius: 12px;
  }

  .profile-header {
    padding: 2rem 1.5rem;
  }

  .profile-form {
    padding: 1.5rem;
  }

  .avatar {
    width: 80px;
    height: 80px;
  }

  .avatar i {
    font-size: 2.5rem;
  }

  .profile-title {
    font-size: 1.5rem;
  }

  .button-group {
    flex-direction: column;
  }

  .btn-save,
  .btn-delete {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .form-group {
    margin-bottom: 1rem;
  }

  .section-title {
    font-size: 1.1rem;
  }

  .modal-dialog {
    margin: 0.5rem;
    width: calc(100% - 1rem);
  }

  .modal-footer {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
