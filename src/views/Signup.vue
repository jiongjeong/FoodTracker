<template>
    <div class="signup-container">
        <h2>Sign Up</h2>
        <form @submit.prevent="submitForm">
            <div class="form-group">
                <label for="name">Name</label>
                <input type="text" id="name" v-model="name" placeholder="Enter your name" required />
            </div>

            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" v-model="email" placeholder="Enter your email" required />
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" v-model="password" placeholder="Enter your password" required />
            </div>

            <div class="form-group">
                <label for="confirmPassword">Confirm Password</label>
                <input type="password" id="confirmPassword" v-model="confirmPassword"
                    placeholder="Confirm your password" required />
            </div>

            <div v-if="errorMessage" class="error">{{ errorMessage }}</div>

            <button type="submit">Sign Up</button>
        </form>

        <!-- Button to redirect to login -->
        <button @click="goToLogin" class="login-redirect-btn">
            Already have an account? Log In
        </button>
    </div>
</template>

<script>
import { getFirestore, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from '@/firebase'; // your Firebase config export

export default {
    name: 'Signup',
    data() {
        return {
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            errorMessage: ''
        };
    },
    methods: {
        async submitForm() {
            const usersRef = collection(db, "user"); // Use "users" if that is your correct collection name

            // Query if email exists
            const q = query(usersRef, where("email", "==", this.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                this.errorMessage = "Email already registered.";
                return;
            }

            try {
                await addDoc(usersRef, {
                    email: this.email,
                    foodScore: 0,
                    name: this.name,
                    password: this.password // Plaintext, use hashing in real apps
                });
                alert('Registration successful!');
                // clear form and redirect if needed
            } catch (e) {
                console.error('Error writing document: ', e);
                alert('Error: ' + e.message);
            }
        },
        goToLogin() {
            this.$router.push('/login');
        }
    }
}
</script>

<style scoped>
/* Keep your existing styles here */
/* Keep your existing styles */

.signup-container {
    background: white;
    max-width: 400px;
    margin: 2rem auto;
    padding: 2rem;
    border-radius: 0.5rem;
    color: black;
    font-family: Arial, sans-serif;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
}

h2 {
    margin-bottom: 1.5rem;
    color: #10b981;
}

.form-group {
    margin-bottom: 1.25rem;
    display: flex;
    flex-direction: column;
}

label {
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: black;
}

input {
    padding: 0.5rem 0.75rem;
    font-size: 1rem;
    border-radius: 0.25rem;
    border: 1px solid #374151;
    color: #000;
    box-sizing: border-box;
    width: 100%;
    transition: border-color 0.3s ease;
}

input:focus {
    border-color: #059669;
    outline: none;
}

button[type='submit'] {
    background: #10b981;
    border: none;
    padding: 0.75rem;
    font-weight: 700;
    border-radius: 0.25rem;
    color: white;
    cursor: pointer;
    width: 100%;
    transition: background-color 0.3s ease;
}

button[type='submit']:hover {
    background: #059669;
}

.login-redirect-btn {
    width: 100%;
    text-align: center;
    margin-top: 1rem;
    padding: 0.75rem;
    background: transparent;
    border: 1px solid #10b981;
    color: #10b981;
    font-weight: 700;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.login-redirect-btn:hover {
    background: #10b981;
    color: #121212;
}

.error {
    background: #dc2626;
    padding: 0.5rem;
    border-radius: 0.25rem;
    text-align: center;
    margin-bottom: 1rem;
    font-weight: 600;
}
</style>
