import { collection, addDb, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase/config";

export const guardarProductoConImagen = async (productoData, archivoImagen) => {
  try {
    // 1. Crear una referencia en Firebase Storage (ej: productos/frente_178974...)
    const nombreArchivo = `productos/${archivoImagen.name}_${Date.now()}`;
    const storageRef = ref(storage, nombreArchivo);

    // 2. Subir el archivo binario
    const snapshot = await uploadBytes(storageRef, archivoImagen);

    // 3. Obtener la URL pública de descarga
    const downloadURL = await getDownloadURL(snapshot.ref);

    // 4. Guardar el producto en Firestore incluyendo la URL de la imagen
    const productoConImagen = {
      ...productoData,
      imagenUrl: downloadURL,
      creadoEn: new Date()
    };

    const docRef = await addDoc(collection(db, "productos"), productoConImagen);
    return { success: true, id: docRef.id };
    
  } catch (error) {
    console.error("Error al subir la imagen y guardar el producto:", error);
    return { success: false, error };
  }
};