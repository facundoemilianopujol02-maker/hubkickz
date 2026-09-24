import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import SalesDashboard from './SalesDashboard';
import PedidosAdmin from './PedidosAdmin'; // Importamos el componente de pedidos

export default function AdminPanel() {
  // Estados para las pestañas: 'dashboard' | 'pedidos' | 'productos'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [productos, setProductos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const [imageFile, setImageFile] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    precio: '',
    descripcion: '',
    categoria: 'calzado',
  });

  // Manejo de Stock por Talle
  const [talles, setTalles] = useState([
    { talle: '38', stock: 0 },
    { talle: '39', stock: 0 },
    { talle: '40', stock: 0 },
    { talle: '41', stock: 0 },
    { talle: '42', stock: 0 },
  ]);

  // 1. Cargar productos desde Firestore
  const fetchProductos = async () => {
    setIsFetching(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'productos'));
      const productosData = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        activo: true,
        talles: [],
        ...docSnap.data(),
      }));
      setProductos(productosData);
    } catch (error) {
      console.error('Error al obtener productos:', error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  // Manejar cambios en el stock de un talle específico
  const handleTalleChange = (index, value) => {
    const newTalles = [...talles];
    newTalles[index].stock = Math.max(0, parseInt(value, 10) || 0);
    setTalles(newTalles);
  };

  // 2. Subir imagen a Cloudinary
  const uploadToCloudinary = async (file) => {
    if (!file) return null;

    const data = new FormData();
    data.append('file', file);
    data.append('upload_preset', 'hubkickz_productos');

    try {
      const response = await fetch(
        'https://api.cloudinary.com/v1_1/c-151872c32a49e938e5b5e686086931/image/upload',
        {
          method: 'POST',
          body: data,
        }
      );
      const result = await response.json();
      return result.secure_url;
    } catch (error) {
      console.error('Error subiendo imagen a Cloudinary:', error);
      return null;
    }
  };

  // 3. Crear Producto
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let imageUrl = '';
      if (imageFile) {
        imageUrl = await uploadToCloudinary(imageFile);
      }

      const tallesConStock = talles.filter((t) => t.stock > 0);

      await addDoc(collection(db, 'productos'), {
        nombre: formData.nombre,
        precio: Number(formData.precio),
        descripcion: formData.descripcion,
        categoria: formData.categoria,
        imagenUrl: imageUrl,
        talles: tallesConStock,
        activo: true,
        createdAt: new Date().toISOString(),
      });

      setFormData({ nombre: '', precio: '', descripcion: '', categoria: 'calzado' });
      setTalles(talles.map((t) => ({ ...t, stock: 0 })));
      setImageFile(null);
      e.target.reset();

      fetchProductos();
    } catch (error) {
      console.error('Error al crear el producto:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Cambiar estado Activo/Inactivo (Pausar producto)
  const toggleEstadoProducto = async (producto) => {
    try {
      const nuevoEstado = !producto.activo;
      await updateDoc(doc(db, 'productos', producto.id), {
        activo: nuevoEstado,
      });
      setProductos(productos.map((p) => (p.id === producto.id ? { ...p, activo: nuevoEstado } : p)));
    } catch (error) {
      console.error('Error al actualizar estado:', error);
    }
  };

  // 5. Eliminar producto
  const handleDelete = async (id) => {
    const confirmar = window.confirm('¿Seguro que quieres eliminar este producto de forma permanente?');
    if (!confirmar) return;

    try {
      await deleteDoc(doc(db, 'productos', id));
      setProductos(productos.filter((producto) => producto.id !== id));
    } catch (error) {
      console.error('Error al eliminar producto:', error);
    }
  };

  // Métricas calculadas del inventario
  const totalProductos = productos.length;
  const totalStockGral = productos.reduce((acc, prod) => {
    if (prod.talles && Array.isArray(prod.talles)) {
      return acc + prod.talles.reduce((sum, t) => sum + (t.stock || 0), 0);
    }
    return acc;
  }, 0);

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="admin-panel-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Encabezado y Navegación por Pestañas */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '2px solid #334155',
          paddingBottom: '10px',
        }}
      >
        <h2 style={{ margin: 0, color: '#f8fafc' }}>// PANEL DE ADMINISTRACIÓN</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === 'dashboard' ? '#e11d48' : '#1e293b',
              color: '#ffffff',
              fontWeight: activeTab === 'dashboard' ? 'bold' : 'normal',
              cursor: 'pointer',
            }}
          >
            Métricas de Ventas
          </button>

          {/* NUEVO BOTÓN PARA VER PEDIDOS */}
          <button
            onClick={() => setActiveTab('pedidos')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === 'pedidos' ? '#e11d48' : '#1e293b',
              color: '#ffffff',
              fontWeight: activeTab === 'pedidos' ? 'bold' : 'normal',
              cursor: 'pointer',
            }}
          >
            Pedidos
          </button>

          <button
            onClick={() => setActiveTab('productos')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === 'productos' ? '#e11d48' : '#1e293b',
              color: '#ffffff',
              fontWeight: activeTab === 'productos' ? 'bold' : 'normal',
              cursor: 'pointer',
            }}
          >
            Gestión de Productos ({totalProductos})
          </button>
        </div>
      </div>

      {/* VISTA 1: DASHBOARD DE VENTAS Y MÉTRICAS */}
      {activeTab === 'dashboard' && (
        <div className="dashboard-section">
          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ marginBottom: '10px', color: '#cbd5e1' }}>Resumen Rápido del Inventario</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px',
              }}
            >
              <div style={{ padding: '15px', background: '#0f172a', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>Total de Modelos</h4>
                <p style={{ fontSize: '22px', fontWeight: 'bold', margin: '5px 0 0', color: '#f8fafc' }}>{totalProductos}</p>
              </div>
              <div style={{ padding: '15px', background: '#0f172a', borderRadius: '8px', borderLeft: '4px solid #22c55e' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>Pares Totales en Stock</h4>
                <p style={{ fontSize: '22px', fontWeight: 'bold', margin: '5px 0 0', color: '#f8fafc' }}>{totalStockGral}</p>
              </div>
              <div style={{ padding: '15px', background: '#0f172a', borderRadius: '8px', borderLeft: '4px solid #eab308' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>Modelos Pausados</h4>
                <p style={{ fontSize: '22px', fontWeight: 'bold', margin: '5px 0 0', color: '#f8fafc' }}>
                  {productos.filter((p) => !p.activo).length}
                </p>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '10px', color: '#0f172a' }}>
            <SalesDashboard />
          </div>
        </div>
      )}

      {/* VISTA 2: GESTIÓN DE PEDIDOS */}
      {activeTab === 'pedidos' && (
        <PedidosAdmin />
      )}

      {/* VISTA 3: GESTIÓN DE PRODUCTOS */}
      {activeTab === 'productos' && (
        <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
          
          {/* Formulario de Alta */}
          <div className="form-section" style={{ background: '#0f172a', padding: '20px', borderRadius: '8px', color: '#f8fafc' }}>
            <h3 style={{ marginTop: 0 }}>Agregar Nuevo Producto</h3>
            <form onSubmit={handleSubmit} className="admin-form" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="Nombre del producto (ej. Nike Air Max)"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff' }}
              />
              <input
                type="number"
                placeholder="Precio ($)"
                value={formData.precio}
                onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                required
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff' }}
              />
              <textarea
                placeholder="Descripción del producto"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                style={{ padding: '8px', minHeight: '80px', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff' }}
              />

              {/* Selector de Stock por Talles */}
              <div style={{ border: '1px solid #334155', padding: '10px', borderRadius: '4px', background: '#1e293b' }}>
                <label style={{ fontWeight: 'bold', fontSize: '14px', color: '#f8fafc' }}>Stock por Talle:</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '8px' }}>
                  {talles.map((t, idx) => (
                    <div key={t.talle} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '13px', minWidth: '50px', color: '#cbd5e1' }}>Talle {t.talle}:</span>
                      <input
                        type="number"
                        min="0"
                        value={t.stock}
                        onChange={(e) => handleTalleChange(idx, e.target.value)}
                        style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                required
                style={{ marginTop: '5px', color: '#cbd5e1' }}
              />
              
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  padding: '10px',
                  background: '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {isLoading ? 'Guardando en Cloudinary...' : 'Crear Producto'}
              </button>
            </form>
          </div>

          {/* Lista de Productos y Buscador */}
          <div className="list-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#f8fafc' }}>Inventario ({productosFiltrados.length})</h3>
              <input
                type="text"
                placeholder="🔍 Buscar por nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '6px 12px', width: '220px', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff' }}
              />
            </div>

            {isFetching ? (
              <p style={{ color: '#94a3b8' }}>Cargando inventario...</p>
            ) : (
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', color: '#f8fafc' }}>
                <thead>
                  <tr style={{ background: '#1e293b', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Imagen</th>
                    <th style={{ padding: '8px' }}>Nombre</th>
                    <th style={{ padding: '8px' }}>Precio</th>
                    <th style={{ padding: '8px' }}>Stock Talles</th>
                    <th style={{ padding: '8px' }}>Estado</th>
                    <th style={{ padding: '8px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ padding: '15px', textAlign: 'center', color: '#94a3b8' }}>
                        No se encontraron productos.
                      </td>
                    </tr>
                  )}
                  {productosFiltrados.map((producto) => (
                    <tr key={producto.id} style={{ borderBottom: '1px solid #334155', opacity: producto.activo ? 1 : 0.6 }}>
                      <td style={{ padding: '8px' }}>
                        {producto.imagenUrl && (
                          <img
                            src={producto.imagenUrl}
                            alt={producto.nombre}
                            width="45"
                            height="45"
                            style={{ objectFit: 'cover', borderRadius: '4px' }}
                          />
                        )}
                      </td>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{producto.nombre}</td>
                      <td style={{ padding: '8px' }}>${producto.precio}</td>
                      <td style={{ padding: '8px', fontSize: '12px' }}>
                        {producto.talles && producto.talles.length > 0 ? (
                          producto.talles.map((t) => (
                            <span
                              key={t.talle}
                              style={{
                                display: 'inline-block',
                                background: '#334155',
                                color: '#f8fafc',
                                padding: '2px 5px',
                                borderRadius: '3px',
                                marginRight: '4px',
                                marginBottom: '2px',
                              }}
                            >
                              T{t.talle}: <b>{t.stock}</b>
                            </span>
                          ))
                        ) : (
                          <span style={{ color: '#64748b' }}>Sin talles</span>
                        )}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <button
                          onClick={() => toggleEstadoProducto(producto)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            background: producto.activo ? '#22c55e' : '#64748b',
                            color: 'white',
                          }}
                        >
                          {producto.activo ? 'Activo' : 'Pausado'}
                        </button>
                      </td>
                      <td style={{ padding: '8px' }}>
                        <button
                          onClick={() => handleDelete(producto.id)}
                          className="btn-delete"
                          style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            padding: '5px 10px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            fontSize: '12px',
                          }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      )}

    </div>
  );
}