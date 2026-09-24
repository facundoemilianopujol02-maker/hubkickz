// Ejemplo en tu página principal o catálogo (ej. Home.js o Productos.jsx)
import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import ProductCard from '../components/ProductCard'; // 👈 Lo importas

function ListaProductos() {
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    const obtenerProductos = async () => {
      const querySnapshot = await getDocs(collection(db, "productos"));
      const lista = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProductos(lista);
    };
    obtenerProductos();
  }, []);

  return (
    <div className="contenedor-catalogo">
      {productos.map(prod => (
        // 👈 Aquí lo utilizas pasándole cada producto como prop
        <ProductCard key={prod.id} producto={prod} /> 
      ))}
    </div>
  );
}

export default ListaProductos;