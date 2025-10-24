<template>
  <div class="login-container">
    <h2>Login</h2>
    <form @submit.prevent="submitForm">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" v-model="email" placeholder="Enter your email" required />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" v-model="password" placeholder="Enter your password" required />
      </div>
      <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
      <button type="submit">Log In</button>
    </form>
    <button @click="goToSignup" class="signup-redirect-btn">
      Don't have an account? Sign Up
    </button>
  </div>
</template>

<script>
import { auth } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default {
  name: 'LoginView',
  data() {
    return {
      email: "",
      password: "",
      errorMessage: "",
      remember: false, // Add remember me data property
    };
  },
  methods: {
    async submitForm() {
      this.errorMessage = "";
      try {
        const userCredential = await signInWithEmailAndPassword(auth, this.email, this.password);
        const user = userCredential.user;

        // Save user data to storage based on remember me option
        const storage = this.remember ? localStorage : sessionStorage;
        storage.setItem("user", JSON.stringify(user));

        window.dispatchEvent(new Event('userChange'));
        this.$router.push('/dashboard');
      } catch (error) {
        switch (error.code) {
          case 'auth/invalid-email':
            this.errorMessage = 'Invalid email.';
            break;
          case 'auth/user-not-found':
            this.errorMessage = 'No account with that email was found.';
            break;
          case 'auth/wrong-password':
            this.errorMessage = 'Incorrect password.';
            break;
          default:
            this.errorMessage = 'Email or password was incorrect.';
        }
      }
    },
    goToSignup() {
      this.$router.push('/signup');
    },
  },
};
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 2rem auto;
  background: white;
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
  font-family: Arial, sans-serif;
}

h2 {
  margin-bottom: 1.5rem;
  color: #059669;
  text-align: center;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 600;
  color: #374151;
}

input {
  width: 100%;
  padding: 0.5rem;
  font-size: 1rem;
  border-radius: 0.25rem;
  border: 1px solid #374151;
  box-sizing: border-box;
}

button {
  width: 100%;
  padding: 0.75rem;
  background: #059669;
  color: white;
  font-weight: 700;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background 0.3s ease;
  margin-top: 0.5rem;
}

button:hover {
  background: #10b981;
}

.error {
  color: #dc2626;
  margin-bottom: 1rem;
  font-weight: 600;
  text-align: center;
}

.signup-redirect-btn {
  background: transparent;
  border: 1px solid #059669;
  color: #059669;
  font-weight: 600;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background 0.3s ease;
}

.signup-redirect-btn:hover {
  background: #10b981;
  color: white;
}
</style>
