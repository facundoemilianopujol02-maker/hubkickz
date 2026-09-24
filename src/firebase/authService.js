import { 
  signOut, 
  onAuthStateChanged, 
  setPersistence, 
  browserLocalPersistence 
} from "firebase/auth";
import { auth } from "./config";

// Configura la persistencia para mantener la sesión
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error al configurar la persistencia:", error.message);
});

// Listener del estado de la sesión
export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

// Cierre de sesión completo
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Error al cerrar sesión:", error.message);
    return { success: false, error: error.message };
  }
};