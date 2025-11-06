<template>
  <div class="login-wrapper">
    <div class="login-container">
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

      <div class="signup-section">
        <p>Don't have an account? <a @click="goToSignup" class="signup-link">Sign Up</a></p>
      </div>
    </div>
  </div>
</template>

<script>
import { auth } from "@/firebase";
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
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
        const persistence = this.remember ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistence);

        let user;
        if (!auth.currentUser) {
          const userCredential = await signInWithEmailAndPassword(auth, this.email, this.password);
          user = userCredential.user;
        } else {
          user = auth.currentUser;
        }

        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        const userToStore = userDoc.exists()
          ? userDoc.data()
          : { uid: user.uid, email: user.email };

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
            this.errorMessage = error.message || 'An error occurred. Please try again.';
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

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--auth-gradient);
  padding: 2rem 1rem;
}

.login-container {
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

.login-form {
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
input[type="password"] {
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

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  color: #6b7280;
}

.remember-me input[type="checkbox"] {
  width: auto;
  cursor: pointer;
  accent-color: #059669;
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

.btn-login {
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

.btn-login:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(5, 150, 105, 0.4);
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
}

.btn-login:active:not(:disabled) {
  transform: translateY(0);
}

.btn-login:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.signup-section {
  text-align: center;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.signup-section p {
  color: #6b7280;
  font-size: 0.95rem;
  margin: 0;
}

.signup-link {
  color: #059669;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s ease;
}

.signup-link:hover {
  color: #047857;
  text-decoration: underline;
}

@media (max-width: 768px) {
  .login-wrapper {
    padding: 1rem 0.5rem;
  }

  .login-container {
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
  .form-options {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }
}
</style>

