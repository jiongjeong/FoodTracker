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
          createdAt: new Date().toISOString(),
          monkey: { selected: 'monkey1',
            unlocked: ['monkey1']
           },
          village: { x: 45, y: 60}
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

<style scoped>
.signup-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--auth-gradient);
  padding: 2rem 1rem;
}

.signup-container {
  max-width: 440px;
  width: 100%;
  background: white;
  padding: 2.5rem 2rem;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
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

.brand-section {
  text-align: center;
  margin-bottom: 2rem;
}

.brand-logo {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
}

.brand-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
}

.brand-subtitle {
  font-size: 0.95rem;
  color: #6b7280;
  margin: 0;
}

.signup-form {
  margin-bottom: 1.5rem;
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
input[type="text"] {
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
}

.toggle-password:hover {
  color: #059669;
}

.toggle-password i {
  font-size: 1.1rem;
}

.password-hint {
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

.btn-signup {
  width: 100%;
  padding: 0.875rem;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  font-weight: 700;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
}

.btn-signup:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(5, 150, 105, 0.4);
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
}

.btn-signup:active:not(:disabled) {
  transform: translateY(0);
}

.btn-signup:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.login-section {
  text-align: center;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.login-section p {
  color: #6b7280;
  font-size: 0.95rem;
  margin: 0;
}

.login-link {
  color: #059669;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s ease;
}

.login-link:hover {
  color: #047857;
  text-decoration: underline;
}

@media (max-width: 768px) {
  .signup-wrapper {
    padding: 1rem 0.5rem;
  }

  .signup-container {
    padding: 2rem 1.5rem;
  }

  .brand-logo {
    width: 64px;
    height: 64px;
  }

  .brand-title {
    font-size: 1.5rem;
  }

  .brand-subtitle {
    font-size: 0.875rem;
  }
}

@media (max-width: 480px) {
  .form-group {
    margin-bottom: 1rem;
  }
}
</style>
