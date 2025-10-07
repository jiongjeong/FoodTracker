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

                <!-- Add more user fields as needed -->
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
import { db } from "@/firebase"; // adjust the path to your firebase config if needed


// Assuming user data is stored in localStorage
const user = ref(null)
const editableUser = ref({})

const router = useRouter()

function loadUser() {
    const userData = localStorage.getItem('user')
    if (userData) {
        user.value = JSON.parse(userData)
        editableUser.value = { ...user.value } // clone for editing
    }
}

async function saveChanges() {
    try {
        if (!user.value || !user.value.id) {
            alert('User ID missing.')
            return
        }

        const userRef = doc(db, 'user', user.value.id)
        // Example fields to update — adjust as needed
        await updateDoc(userRef, {
            name: editableUser.value.name,
            email: editableUser.value.email,
            password: editableUser.value.password,  // Include password here
            // other fields as needed
        })

        // Update localStorage user object with new values
        localStorage.setItem('user', JSON.stringify(editableUser.value))
        user.value = { ...editableUser.value }

        alert('Profile updated.')
    } catch (error) {
        alert('Error updating profile: ' + error.message)
    }
}


async function deleteAccount() {
    if (!user.value || !user.value.id) {
        alert('User ID missing.')
        return
    }
    if (confirm('Are you sure you want to delete your account? This is irreversible.')) {
        try {
            const userRef = doc(db, 'user', user.value.id)

            await deleteDoc(userRef)

            // Clear local data and redirect
            localStorage.removeItem('user')
            alert('Account deleted.')
            router.push('/signup')

            // Optional: if you also use Firebase Auth, call delete on auth user here
        } catch (error) {
            alert('Error deleting account: ' + error.message)
        }
    }
}


onMounted(() => {
    loadUser()
})

const passwords = ref({
    current: '',
    new: '',
    confirm: ''
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
}

.form-group {
    margin-bottom: 1rem;
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
