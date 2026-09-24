import { useState } from 'react';
import { collection, addDoc } from "firebase/firestore"; 
import { db } from "./firebase"; // Asegúrate de que la ruta coincida con tu archivo firebase.js

export default function FormularioProducto() {
  // 1. Estados para los datos del producto
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  
  // 2. Estados para la imagen de Cloudinary
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 3. Función para subir la imagen a Cloudinary apenas se selecciona
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "react_tienda"); // Tu preset de Cloudinary

    try {
      // Tu Cloud Name en la URL de la API
      const response = await fetch(
        "https://api.cloudinary.com/v1_1/151872c32a49e938e5b5e686086931/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      
      // Guardamos la URL segura generada
      setImageUrl(data.secure_url);
      console.log("Imagen subida con éxito:", data.secure_url);
      
    } catch (error) {
      console.error("Error al subir la imagen:", error);
      alert("Hubo un error al subir la imagen.");
    } finally {
      setIsUploading(false);
    }
  };

  // 4. Función para guardar todo en Firebase Firestore
  const handleSubmit = async (e) => {
    e.preventDefault(); // Evita que la página se recargue

    // Validamos que la imagen ya se haya subido
    if (!imageUrl) {
      alert("Por favor, espera a que la imagen termine de subirse o selecciona una.");
      return;
    }

    setIsSaving(true);

    try {
      // Guardamos el documento en la colección "productos" de Firestore
      await addDoc(collection(db, "productos"), {
        nombre: nombre,
        precio: Number(precio), // Convertimos el precio a número
        descripcion: descripcion,
        imagen: imageUrl, // Aquí guardamos el enlace de Cloudinary
        fechaCreacion: new Date()
      });

      alert("¡Producto publicado con éxito!");
      
      // Limpiamos el formulario para agregar otro producto
      setNombre("");
      setPrecio("");
      setDescripcion("");
      setImageUrl("");
      
    } catch (error) {
      console.error("Error al guardar en Firestore:", error);
      alert("Error al guardar el producto.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <h2>Agregar Nuevo Producto</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* Campo Nombre */}
        <div>
          <label>Nombre del producto:</label><br/>
          <input 
            type="text" 
            required 
            value={nombre} 
            onChange={(e) => setNombre(e.target.value)} 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        {/* Campo Precio */}
        <div>
          <label>Precio ($):</label><br/>
          <input 
            type="number" 
            required 
            value={precio} 
            onChange={(e) => setPrecio(e.target.value)} 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        {/* Campo Descripción */}
        <div>
          <label>Descripción:</label><br/>
          <textarea 
            required 
            value={descripcion} 
            onChange={(e) => setDescripcion(e.target.value)} 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        {/* Campo Imagen (Cloudinary) */}
        <div>
          <label>Imagen del producto:</label><br/>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleImageUpload} 
            disabled={isUploading || isSaving}
          />
          
          {isUploading && <p style={{ color: 'blue' }}>Subiendo imagen...</p>}
          
          {imageUrl && (
            <div style={{ marginTop: '10px' }}>
              <img 
                src={imageUrl} 
                alt="Vista previa" 
                style={{ width: "100%", maxHeight: "200px", objectFit: "contain", border: "1px solid #ccc", borderRadius: "8px" }} 
              />
            </div>
          )}
        </div>

        {/* Botón de Submit */}
        <button 
          type="submit" 
          disabled={isUploading || isSaving || !imageUrl}
          style={{ padding: '10px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          {isSaving ? "Guardando..." : "Publicar Producto"}
        </button>

      </form>
    </div>
  );
}