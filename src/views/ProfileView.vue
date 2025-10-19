<script setup name="ProfileView">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { doc, getDoc, getDocs, updateDoc, deleteDoc, collection } from "firebase/firestore";
import { getAuth, updateProfile, updateEmail, updatePassword, deleteUser } from "firebase/auth";
import { db } from "@/firebase";

const router = useRouter()
const auth = getAuth()
const user = ref(auth.currentUser)
const editableUser = ref({
  name: '',
  email: '',
  contactNo: '',
  handle: ''
})

const passwords = ref({
  current: '',
  new: '',
  confirm: ''
})

const loading = ref(true)
async function loadUser() {
  loading.value = true
  auth.onAuthStateChanged(async (u) => {
    user.value = u
    if (u) {
      const userDoc = await getDoc(doc(db, "user", u.uid))
      if (userDoc.exists()) {
        const profile = userDoc.data()
        editableUser.value = {
          name: profile.name || '',
          email: profile.email || '',
          contactNo: profile.contactNo || '',
          handle: profile.handle || ''
        }
      } else {
        editableUser.value = { name: '', email: u.email || '', contactNo: '', handle: '' }
      }
    }
    loading.value = false
  })
}

async function saveChanges() {
  if (!user.value) {
    alert('User not found.')
    return
  }
  if (passwords.value.new && passwords.value.new !== passwords.value.confirm) {
    alert('New password and confirmation do not match.')
    return
  }
  try {

    await updateDoc(doc(db, "user", user.value.uid), {
      name: editableUser.value.name,
      email: editableUser.value.email,
      contactNo: editableUser.value.contactNo,
      handle: editableUser.value.handle
    })

    await updateProfile(user.value, { displayName: editableUser.value.name })
    if (user.value.email !== editableUser.value.email) {
      await updateEmail(user.value, editableUser.value.email)
    }
    if (passwords.value.new) {
      await updatePassword(user.value, passwords.value.new)
    }

    passwords.value.current = ''
    passwords.value.new = ''
    passwords.value.confirm = ''

    alert('Profile updated.')

    window.location.reload()
  } catch (error) {
    alert('Error updating profile: ' + error.message)
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

async function deleteAccount() {
  if (!user.value) {
    alert("User not found.");
    return;
  }
  if (confirm("Are you sure you want to delete your account? This is irreversible.")) {
    try {
      const userDocRef = doc(db, "user", user.value.uid);


      const subcollections = ["foodItems", "activities", "recipes"];
      for (const subcol of subcollections) {
        const subcolRef = collection(userDocRef, subcol);
        await deleteCollection(subcolRef);
      }

      await deleteDoc(userDocRef);

      await deleteUser(user.value);

      alert("Account deleted.");
      router.push("/signup");
    } catch (error) {
      alert("Error deleting account: " + error.message);
    }
  }
}

onMounted(() => {
  loadUser()
})
</script>

<template>
  <div class="profile-page">
    <h2>User Profile</h2>
    <div v-if="!loading">
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
          <label>New Password:</label>
          <input v-model="passwords.new" type="password" placeholder="Enter new password" />
        </div>
        <div class="form-group">
          <label>Confirm New Password:</label>
          <input v-model="passwords.confirm" type="password" placeholder="Confirm new password" />
        </div>
        <div class="form-group">
          <label>Contact Number:</label>
          <input v-model="editableUser.contactNo" type="text" placeholder="Enter contact number" />
        </div>
        <div class="form-group">
          <label>Telegram Handle:</label>
          <input v-model="editableUser.handle" type="text" placeholder="Enter Telegram handle" />
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

<style scoped>
.profile-page {
  width: 50%;
  margin: auto;
  padding: 2rem;
  background: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.profile-page h2 {
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
  text-align: left;
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
