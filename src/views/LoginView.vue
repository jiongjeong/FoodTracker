<template>
  <div class="login-wrapper">
    <div class="login-container">
      <!-- Logo and Brand -->
      <div class="brand-section">
        <img src="/bigbackicon.jpg" alt="FoodTracker" class="brand-logo" />
        <h2 class="brand-title">Welcome Back!</h2>
        <p class="brand-subtitle">Sign in to continue to FoodTracker</p>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="submitForm" class="login-form">
        <div class="form-group">
          <label for="email">
            <i class="bi bi-envelope-fill"></i>
            Email Address
          </label>
          <input
            type="email"
            id="email"
            v-model="email"
            placeholder="Enter your email"
            required
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <label for="password">
            <i class="bi bi-lock-fill"></i>
            Password
          </label>
          <div class="password-input-wrapper">
            <input
              :type="showPassword ? 'text' : 'password'"
              id="password"
              v-model="password"
              placeholder="Enter your password"
              required
              autocomplete="current-password"
            />
            <button
              type="button"
              class="toggle-password"
              @click="showPassword = !showPassword"
              tabindex="-1"
            >
              <i :class="showPassword ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill'"></i>
            </button>
          </div>
        </div>

        <div class="form-options">
          <label class="remember-me">
            <input type="checkbox" v-model="remember" />
            <span>Remember me</span>
          </label>
        </div>

        <div v-if="errorMessage" class="error-message">
          <i class="bi bi-exclamation-circle-fill"></i>
          {{ errorMessage }}
        </div>

        <button type="submit" class="btn-login" :disabled="isLoading">
          <span v-if="!isLoading">Sign In</span>
          <span v-else class="spinner-border spinner-border-sm" role="status"></span>
        </button>
      </form>

      <!-- Sign Up Link -->
      <div class="signup-section">
        <p>Don't have an account? <a @click="goToSignup" class="signup-link">Sign Up</a></p>
      </div>
    </div>
  </div>
</template>

<script>
import { auth } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

export default {
  name: 'LoginView',
  data() {
    return {
      email: "",
      password: "",
      errorMessage: "",
      remember: false,
      showPassword: false,
      isLoading: false
    };
  },
  methods: {
    async submitForm() {
      this.errorMessage = "";
      this.isLoading = true;

      try {
        const userCredential = await signInWithEmailAndPassword(auth, this.email, this.password);
        const user = userCredential.user;

        // Get user document from Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        const userToStore = userDoc.exists()
          ? userDoc.data()
          : { uid: user.uid, email: user.email };

        // Save user data to storage based on remember me option
        const storage = this.remember ? localStorage : sessionStorage;
        storage.setItem("user", JSON.stringify(userToStore));

        window.dispatchEvent(new Event('userChange'));
        this.$router.push('/dashboard');
      } catch (error) {
        switch (error.code) {
          case 'auth/invalid-email':
            this.errorMessage = 'Invalid email address.';
            break;
          case 'auth/user-not-found':
            this.errorMessage = 'No account found with this email.';
            break;
          case 'auth/wrong-password':
            this.errorMessage = 'Incorrect password.';
            break;
          case 'auth/invalid-credential':
            this.errorMessage = 'Invalid email or password.';
            break;
          default:
            this.errorMessage = 'An error occurred. Please try again.';
        }
      } finally {
        this.isLoading = false;
      }
    },

    goToSignup() {
      this.$router.push('/signup');
    },
  },
};
</script>

