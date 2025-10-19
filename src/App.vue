<script>
import { reactive, provide, onMounted } from "vue";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import Navbar from "./components/navbar/navbar.vue"

export default {
  components:{
    Navbar
  },
  setup() {
    const userState = reactive({ name: "" });
    provide("userState", userState);

    const auth = getAuth();

    onMounted(async () => {
      if (auth.currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "user", auth.currentUser.uid));
          if (userDoc.exists()) {
            userState.name = userDoc.data().name || "";
          }
        } catch (error) {
          console.error("Failed fetching user profile", error);
        }
      }
    });

    return { userState };
  },
};

</script>


<template>
  <div class="app-container">
    <Navbar />
    <RouterView />
  </div>
</template>


<style scoped>
.app-container {
  min-height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  overflow-x: hidden;
}

@media (min-width: 992px) {
  .navbar,
  .container-fluid {
    width: 100vw !important;
    max-width: 100vw !important;
    margin: 0 !important;
    left: 0;
    right: 0;
  }
}
</style>
