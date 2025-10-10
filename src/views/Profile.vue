<template>
  <div class="profile-page">
    <h2>User Profile</h2>
    <div v-if="user">
      <form @submit.prevent="saveChanges">
        <div class="form-group">
          <label>Name:</label>
          <input v-model="editableUser.name" type="text" required />
        </div>
        <div class="form-group">
          <label>Email:</label>
          <input v-model="editableUser.email" type="email" required />
        </div>
        <div class="form-group">
          <label>Current Password:</label>
          <input v-model="passwords.current" type="password" placeholder="Enter current password" />
        </div>
        <div class="form-group">
          <label>New Password:</label>
          <input v-model="passwords.new" type="password" placeholder="Enter new password" />
        </div>
        <div class="form-group">
          <label>Confirm New Password:</label>
          <input v-model="passwords.confirm" type="password" placeholder="Confirm new password" />
        </div>
        <button type="submit">Save Changes</button>
      </form>
      <button class="delete-btn" @click="deleteAccount">Delete Account</button>
    </div>
    <div v-else>
      Loading user data...
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase";

const router = useRouter()

// States
const user = ref(null)
const editableUser = ref({})
const passwords = ref({
  current: '',
  new: '',
  confirm: ''
})
const dropdownOpen = ref(false)
const navbarOpen = ref(false)

// Load user data from localStorage
function loadUser() {
  const userData = localStorage.getItem('user')
  if (userData) {
    user.value = JSON.parse(userData)
    editableUser.value = { ...user.value }
  }
}

// Save profile changes
async function saveChanges() {
  try {
    if (!user.value || !user.value.id) {
      alert('User ID missing.');
      return;
    }

    if (passwords.value.new && passwords.value.new !== passwords.value.confirm) {
      alert('New password and confirmation do not match.');
      return;
    }

    const userRef = doc(db, 'user', user.value.id);
    const updateData = {
      name: editableUser.value.name,
      email: editableUser.value.email,
    };

    if (passwords.value.new) {
      updateData.password = passwords.value.new;
    }

    await updateDoc(userRef, updateData);

    const updatedUser = { ...editableUser.value };
    if (passwords.value.new) {
      updatedUser.password = passwords.value.new;
    }

    localStorage.setItem('user', JSON.stringify(updatedUser));
    user.value = { ...updatedUser };

    // Clear password fields
    passwords.value.current = '';
    passwords.value.new = '';
    passwords.value.confirm = '';

    alert('Profile updated.');
  } catch (error) {
    alert('Error updating profile: ' + error.message);
  }
}


// Delete user account
async function deleteAccount() {
  if (!user.value || !user.value.id) {
    alert('User ID missing.')
    return
  }
  if (confirm('Are you sure you want to delete your account? This is irreversible.')) {
    try {
      const userRef = doc(db, 'user', user.value.id)
      await deleteDoc(userRef)
      localStorage.removeItem('user')
      alert('Account deleted.')
      localStorage.clear()
      window.dispatchEvent(new Event("userChange"))
      router.push('/signup')
    } catch (error) {
      alert('Error deleting account: ' + error.message)
    }
  }
}

// Logout function, exposed to parent
function logout() {
  localStorage.removeItem('user')
  window.dispatchEvent(new Event("userChange"))
  dropdownOpen.value = false
  navbarOpen.value = false
  router.push('/login')
}
defineExpose({ logout })

onMounted(() => {
  loadUser()
})
</script>

<style scoped>
.profile-page {
  max-width: 500px;
  margin: auto;
  padding: 2rem;
  background: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
  text-align: center; /* Add this to center all text inside */
}

.profile-page h2 {
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
  text-align: left; /* Override parent center if you want inputs left-aligned */
}


label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 600;
}

input {
  width: 100%;
  padding: 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid #ccc;
}

button {
  padding: 0.75rem 1.5rem;
  background: #059669;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

button:hover {
  background: #10b981;
}

.delete-btn {
  margin-top: 1rem;
  background: #dc2626;
}

.delete-btn:hover {
  background: #b91c1c;
}
</style>
