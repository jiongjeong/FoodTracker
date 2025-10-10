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

    <!-- Button to redirect to signup -->
    <button @click="goToSignup" class="signup-redirect-btn">
      Don't have an account? Sign Up
    </button>
  </div>
</template>

<script>
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase";  // Your firebase configuration export

export default {
  data() {
    return {
      email: "",
      password: "",
      errorMessage: ""
    };
  },
  methods: {
    async submitForm() {
      this.errorMessage = "";
      try {
        const usersRef = collection(db, "user");  // Confirm your collection name here
        const q = query(usersRef, where("email", "==", this.email), where("password", "==", this.password));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          this.errorMessage = "Invalid email or password.";
          return;
        }

        const userDoc = {...
          querySnapshot.docs[0].data(),
          id: querySnapshot.docs[0].id
        }
        console.log("User logged in:", userDoc);

        // Store user data in localStorage for session persistence
        localStorage.setItem("user", JSON.stringify(userDoc));
        window.dispatchEvent(new Event('userChange'));  // Important: Notify other components immediately

        // Redirect on successful login
        this.$router.push('/dashboard');
      } catch (error) {
        this.errorMessage = "Login failed: " + error.message;
      }
    },
    goToSignup() {
      this.$router.push('/signup');
    }
  }
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
