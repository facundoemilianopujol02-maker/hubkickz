import { auth } from './firebaseConfig';
import { 
  signInWithEmailAndPassword, 
  sendEmailVerification, 
  signOut 
} from 'firebase/auth';

/**
 * Reenvía el email de verificación autenticando temporalmente al usuario.
 */
export const resendVerificationEmail = async (email, password) => {
  try {
    // 1. Iniciar sesión temporal para obtener la instancia del usuario
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Si ya está verificado, avisar que no hace falta
    if (user.emailVerified) {
      await signOut(auth);
      return { success: false, message: 'Este correo ya se encuentra verificado.' };
    }

    // 3. Reenviar correo de verificación
    await sendEmailVerification(user);

    // 4. Cerrar sesión nuevamente
    await signOut(auth);

    return { success: true, message: 'Correo de verificación reenviado con éxito.' };
  } catch (error) {
    console.error("Error al reenviar verificación:", error);
    throw error;
  }
};