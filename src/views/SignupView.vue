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
        <input type="password" id="confirmPassword" v-model="confirmPassword" placeholder="Confirm your password" required />
      </div>

      <div v-if="errorMessage" class="error">{{ errorMessage }}</div>

      <button type="submit">Sign Up</button>
    </form>

    <button @click="goToLogin" class="login-redirect-btn">
      Already have an account? Log In
    </button>
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
      errorMessage: ''
    };
  },
  methods: {
    async submitForm() {
      this.errorMessage = "";
      if (this.password !== this.confirmPassword) {
        this.errorMessage = "Passwords do not match.";
        return;
      }
      try {
        // Create Auth user
        const userCredential = await createUserWithEmailAndPassword(auth, this.email, this.password);
        const user = userCredential.user;

        // Update Firebase Auth display name
        await updateProfile(user, { displayName: this.name });

        // Create Firestore user document with UID as ID
        await setDoc(doc(db, "user", user.uid), {
          name: this.name,
          email: this.email,
          foodScore: 0,
          createdAt: new Date()
        });

        // Initialize user subcollections
        await this.initializeUserCollections(user.uid);

        // Redirect to login or dashboard
        this.$router.push('/login');
      } catch (error) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            this.errorMessage = "Email is already registered.";
            break;
          case 'auth/invalid-email':
            this.errorMessage = "Invalid email.";
            break;
          case 'auth/weak-password':
            this.errorMessage = "Password is too weak.";
            break;
          default:
            this.errorMessage = "Signup failed: " + error.message;
        }
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
        type: "",
        description: "",
        points: 0,
        relatedItemId: "",
        quantity: 0,
        unit: "",
        moneySaved: 0,
        wasteAvoided: false,
        category: "",
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
  text-align: center;
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
