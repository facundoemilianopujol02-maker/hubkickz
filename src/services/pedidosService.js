import { db } from "../firebase/config";
import { collection, addDoc, getDocs } from "firebase/firestore";

const ORDERS_COLLECTION = "pedidos";

// Guardar una nueva compra
export const crearPedido = async (pedido) => {
  const docRef = await addDoc(collection(db, ORDERS_COLLECTION), {
    ...pedido,
    fecha: new Date().toISOString()
  });
  return docRef.id;
};