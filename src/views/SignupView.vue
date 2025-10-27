<template>
  <div class="signup-wrapper">
    <div class="signup-container">
      <!-- Logo and Brand -->
      <div class="brand-section">
        <img src="/bigbackicon.jpg" alt="FoodTracker" class="brand-logo" />
        <h2 class="brand-title">Create Account</h2>
        <p class="brand-subtitle">Join FoodTracker and start reducing waste today</p>
      </div>

      <!-- Signup Form -->
      <form @submit.prevent="submitForm" class="signup-form">
        <div class="form-group">
          <label for="name">
            <i class="bi bi-person-fill"></i>
            Full Name
          </label>
          <input
            type="text"
            id="name"
            v-model="name"
            placeholder="Enter your full name"
            required
            autocomplete="name"
          />
        </div>

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
              placeholder="Create a password"
              required
              autocomplete="new-password"
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
          <small class="password-hint">At least 6 characters</small>
        </div>

        <div class="form-group">
          <label for="confirmPassword">
            <i class="bi bi-lock-check-fill"></i>
            Confirm Password
          </label>
          <div class="password-input-wrapper">
            <input
              :type="showConfirmPassword ? 'text' : 'password'"
              id="confirmPassword"
              v-model="confirmPassword"
              placeholder="Confirm your password"
              required
              autocomplete="new-password"
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

        <div v-if="errorMessage" class="error-message">
          <i class="bi bi-exclamation-circle-fill"></i>
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="success-message">
          <i class="bi bi-check-circle-fill"></i>
          {{ successMessage }}
        </div>

        <button type="submit" class="btn-signup" :disabled="isLoading">
          <span v-if="!isLoading">Create Account</span>
          <span v-else class="spinner-border spinner-border-sm" role="status"></span>
        </button>
      </form>

      <!-- Login Link -->
      <div class="login-section">
        <p>Already have an account? <a @click="goToLogin" class="login-link">Sign In</a></p>
      </div>
    </div>
  </div>
</template>

<script>
import { auth, db } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";

export default {
  name: 'SignupView',
  data() {
    return {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      errorMessage: '',
      successMessage: '',
      showPassword: false,
      showConfirmPassword: false,
      isLoading: false
    };
  },
  methods: {
    async submitForm() {
      this.errorMessage = "";
      this.successMessage = "";

      if (this.password !== this.confirmPassword) {
        this.errorMessage = "Passwords do not match.";
        return;
      }

      if (this.password.length < 6) {
        this.errorMessage = "Password must be at least 6 characters.";
        return;
      }

      this.isLoading = true;

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, this.email, this.password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: this.name });

        await setDoc(doc(db, "user", user.uid), {
          name: this.name,
          email: this.email,
          contactNo: "",
          handle: "",
          foodScore: 0,
          createdAt: new Date().toISOString()
        });

        await this.initializeUserCollections(user.uid);

        this.successMessage = "Account created successfully! Redirecting...";

        setTimeout(() => {
          this.$router.push('/login');
        }, 2000);
      } catch (error) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            this.errorMessage = "Email is already registered.";
            break;
          case 'auth/invalid-email':
            this.errorMessage = "Invalid email address.";
            break;
          case 'auth/weak-password':
            this.errorMessage = "Password is too weak. Use at least 6 characters.";
            break;
          default:
            this.errorMessage = "Signup failed. Please try again.";
        }
      } finally {
        this.isLoading = false;
      }
    },

    async initializeUserCollections(userId) {
      try {
        await this.initializeFoodItemsCollection(userId);
        await this.initializeActivitiesCollection(userId);
        await this.initializeRecipesCollection(userId);
        console.log('User collections initialized successfully');
      } catch (error) {
        console.error('Error initializing user collections:', error);
      }
    },

    async initializeFoodItemsCollection(userId) {
      const foodItemsRef = collection(doc(db, "user", userId), "foodItems");
      await addDoc(foodItemsRef, {
        _placeholder: true,
        name: "",
        category: "",
        quantity: 0,
        unit: "",
        expirationDate: "",
        price: 0,
      });
    },

    async initializeActivitiesCollection(userId) {
      const activitiesRef = collection(doc(db, "user", userId), "activities");
      await addDoc(activitiesRef, {
        _placeholder: true,
        activityType: "",
        foodName: "",
        quantity: "",
        price: "",
        createdAt: ""
      });
    },

    async initializeRecipesCollection(userId) {
      const recipesRef = collection(doc(db, "user", userId), "recipes");
      await addDoc(recipesRef, {
        _placeholder: true,
        idMeal: "",
      });
    },

    goToLogin() {
      this.$router.push('/login');
    }
  }
}
</script>
