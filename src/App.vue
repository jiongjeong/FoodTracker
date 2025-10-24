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
  <div class="container-fluid min-vh-100 d-flex flex-column p-0 m-0">
    <Navbar />
    <RouterView />
  </div>
</template>


<style scoped>
/* No custom layout styles needed; all handled by Bootstrap classes. */
</style>
