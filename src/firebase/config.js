import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBMPFK_DAsQKNW_Bg6dvIh0cda7jVfSiIs",
  authDomain: "hubkickz-969ee.firebaseapp.com",
  projectId: "hubkickz-969ee",
  storageBucket: "hubkickz-969ee.firebasestorage.app",
  messagingSenderId: "596246326578",
  appId: "1:596246326578:web:2dc2e5390a4fed51b3fb2b",
  measurementId: "G-08J653CLP3"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);