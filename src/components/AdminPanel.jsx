import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('agregar');

  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState('ROPA');
  const [subcategoria, setSubcategoria] = useState('REMERAS');
  const [tag, setTag] = useState('NEW DROP');
  const [tallesSeleccionados, setTallesSeleccionados] = useState(['S', 'M', 'L', 'XL']);
  const [imagenFrenteFile, setImagenFrenteFile] = useState(null);
  const [imagenEspaldaFile, setImagenEspaldaFile] = useState(null);
  
  // Selector para clasificar el destino del producto ('stock' o 'encargo')
  const [tipoProducto, setTipoProducto] = useState('stock');

  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [periodoEstadistica, setPeriodoEstadistica] = useState('30d');

  const CLOUD_NAME = 'geavvy5g';
  const UPLOAD_PRESET = 'hubkickz_productos';

  const tallesDisponibles = ['S', 'M', 'L', 'XL', 'XXL'];

  // Separar productos por su clasificación
  const productosStock = productos.filter(p => p.tipo !== 'encargo');
  const productosEncargos = productos.filter(p => p.tipo === 'encargo');

  useEffect(() => {
    if (categoria === 'ROPA') {
      setSubcategoria('REMERAS');
    } else if (categoria === 'PERFUMES') {
      setSubcategoria('HOMBRE');
    }
  }, [categoria]);

  // Sincronización en tiempo real de productos y pedidos desde Firestore
  useEffect(() => {
    const unsubscribeProductos = onSnapshot(collection(db, 'productos'), (snapshot) => {
      const listaProductos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProductos(listaProductos);
    }, (err) => {
      console.error('Error al obtener productos:', err);
    });

    const unsubscribePedidos = onSnapshot(collection(db, 'pedidos'), (snapshot) => {
      const listaPedidos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPedidos(listaPedidos);
    }, (err) => {
      console.error('Error al obtener pedidos:', err);
    });

    return () => {
      unsubscribeProductos();
      unsubscribePedidos();
    };
  }, []);

  const toggleTalle = (talle) => {
    if (tallesSeleccionados.includes(talle)) {
      setTallesSeleccionados(tallesSeleccionados.filter(t => t !== talle));
    } else {
      setTallesSeleccionados([...tallesSeleccionados, talle]);
    }
  };

  const subirACloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Error al subir imagen a Cloudinary');
    }
    return data.secure_url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');
    setLoading(true);

    try {
      let imagenUrl = '';
      let imagenEspaldaUrl = '';

      if (imagenFrenteFile) {
        imagenUrl = await subirACloudinary(imagenFrenteFile);
      }
      if (imagenEspaldaFile) {
        imagenEspaldaUrl = await subirACloudinary(imagenEspaldaFile);
      }

      const imagenesArray = [imagenUrl, imagenEspaldaUrl].filter(Boolean);

      const nuevoProducto = {
        nombre: nombre.trim() || '',
        precio: Number(precio) || 0,
        categoria: categoria.trim() || 'ROPA',
        subcategoria: subcategoria.trim() || 'REMERAS',
        tag: tag.trim() || '',
        talles: categoria === 'PERFUMES' ? [] : tallesSeleccionados,
        imagenUrl: imagenUrl || '',
        imagenEspaldaUrl: imagenEspaldaUrl || '',
        imagenes: imagenesArray,
        tipo: tipoProducto,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'productos'), nuevoProducto);

      setExito('¡Artículo publicado con éxito!');
      setNombre('');
      setPrecio('');
      setImagenFrenteFile(null);
      setImagenEspaldaFile(null);
      setTipoProducto('stock');

    } catch (err) {
      console.error('Error al crear el producto:', err);
      setError(err.message || 'Hubo un error al publicar el artículo.');
    } finally {
      setLoading(false);
    }
  };

  const eliminarProducto = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este artículo?')) {
      try {
        await deleteDoc(doc(db, 'productos', id));
      } catch (err) {
        console.error('Error al eliminar:', err);
      }
    }
  };

  const handleCambiarEstadoPedido = async (pedidoId, nuevoEstado) => {
    try {
      const pedidoRef = doc(db, 'pedidos', pedidoId);
      const ahora = new Date();
      const updateData = { 
        estado: nuevoEstado, 
        updatedAt: ahora 
      };
      
      const estNorm = (nuevoEstado || '').toLowerCase();
      if (estNorm.includes('entregado') || estNorm.includes('recibido')) {
        updateData.fechaEntrega = ahora;
      }

      await updateDoc(pedidoRef, updateData);
    } catch (err) {
      console.error('Error al actualizar estado del pedido:', err);
      alert('Hubo un error al actualizar el estado.');
    }
  };

  // Parser robusto para parsear fechas de Firestore, cadenas ISO o DD/MM/YYYY sin errores de zona horaria
  const parsearFecha = (val) => {
    if (!val) return null;
    
    if (val.toDate && typeof val.toDate === 'function') {
      return val.toDate();
    }
    if (val.seconds) {
      return new Date(val.seconds * 1000);
    }
    if (val instanceof Date && !isNaN(val.getTime())) {
      return val;
    }
    if (typeof val === 'number') {
      return new Date(val);
    }
    
    if (typeof val === 'string') {
      const trimmed = val.trim();
      // Parsear formato DD/MM/YYYY o DD-MM-YYYY explícitamente
      if (trimmed.includes('/') || trimmed.includes('-')) {
        const parts = trimmed.replace(/-/g, '/').split('/');
        if (parts.length === 3) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const y = parseInt(parts[2], 10);
          if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
            const fullYear = y < 100 ? 2000 + y : y;
            const parsedCustom = new Date(fullYear, m - 1, d);
            if (!isNaN(parsedCustom.getTime())) return parsedCustom;
          }
        }
      }
      const parsedIso = new Date(trimmed);
      if (!isNaN(parsedIso.getTime())) return parsedIso;
    }

    return null;
  };

  const obtenerFechaPedido = (p) => {
    // 1. Preferir la fecha de entrega o de última actualización
    const fechaEnt = parsearFecha(p.fechaEntrega) || parsearFecha(p.updatedAt);
    if (fechaEnt) return fechaEnt;

    // 2. Fecha de creación original
    const fechaCreacion = parsearFecha(p.createdAt) || parsearFecha(p.fecha) || parsearFecha(p.timestamp);
    if (fechaCreacion) return fechaCreacion;

    return new Date();
  };

  const calcularMontoPedido = (p) => {
    if (p.totalAmount !== undefined && p.totalAmount !== null && !isNaN(Number(p.totalAmount))) {
      return Number(p.totalAmount);
    }
    if (p.total !== undefined && p.total !== null && !isNaN(Number(p.total))) {
      return Number(p.total);
    }
    if (Array.isArray(p.cart) && p.cart.length > 0) {
      return p.cart.reduce((sum, item) => {
        const price = Number(item.precio || item.price || 0);
        const qty = Number(item.quantity || item.cantidad || 1);
        return sum + (price * qty);
      }, 0);
    }
    return 0;
  };

  const filtrarPedidosPorPeriodo = () => {
    const ahora = new Date();

    const pedidosEntregados = pedidos.filter(p => {
      const est = (p.estado || '').toLowerCase().trim();
      return est.includes('entregado') || est.includes('recibido') || est.includes('completado');
    });

    if (periodoEstadistica === 'todos') return pedidosEntregados;

    return pedidosEntregados.filter(p => {
      const fechaPedido = obtenerFechaPedido(p);
      
      const diffTime = ahora - fechaPedido;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (periodoEstadistica === '3d') return diffDays <= 3;
      if (periodoEstadistica === '7d') return diffDays <= 7;
      if (periodoEstadistica === '15d') return diffDays <= 15;
      if (periodoEstadistica === '30d') return diffDays <= 30;
      if (periodoEstadistica === '6m') return diffDays <= 180;
      if (periodoEstadistica === '12m') return diffDays <= 365;
      return true;
    });
  };

  const pedidosFiltradosEstadisticas = filtrarPedidosPorPeriodo();
  const totalVentasUSD = pedidosFiltradosEstadisticas.reduce((acc, p) => acc + calcularMontoPedido(p), 0);
  const totalPedidosCompletados = pedidosFiltradosEstadisticas.length;

  return (
    <div style={{ maxWidth: '850px', margin: '30px auto', padding: '30px', background: '#08080a', color: '#e5e5e5', fontFamily: 'monospace, sans-serif', border: '1px solid #1a1a20', borderRadius: '4px' }}>
      
      <div style={{ marginBottom: '20px' }}>
        <span style={{ color: '#ff1e2d', fontSize: '0.75rem', letterSpacing: '1px' }}>// ADMIN CONTROL PANEL</span>
        <h2 style={{ fontSize: '1.8rem', letterSpacing: '1.5px', color: '#fff', marginTop: '4px', fontFamily: 'serif' }}>
          GESTIÓN HUB KICKZ
        </h2>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '30px', borderBottom: '1px solid #1f1f26', paddingBottom: '15px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('agregar')}
          style={{
            background: activeTab === 'agregar' ? '#ff1e2d' : '#0e0e12',
            color: '#fff',
            border: activeTab === 'agregar' ? '1px solid #ff1e2d' : '1px solid #1f1f26',
            padding: '10px 16px',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '0.75rem',
            letterSpacing: '1.5px',
            fontWeight: 'bold'
          }}
        >
          + AGREGAR
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stock')}
          style={{
            background: activeTab === 'stock' ? '#ff1e2d' : '#0e0e12',
            color: '#fff',
            border: activeTab === 'stock' ? '1px solid #ff1e2d' : '1px solid #1f1f26',
            padding: '10px 16px',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '0.75rem',
            letterSpacing: '1.5px',
            fontWeight: 'bold'
          }}
        >
          STOCK ({productosStock.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('encargos')}
          style={{
            background: activeTab === 'encargos' ? '#ff1e2d' : '#0e0e12',
            color: '#fff',
            border: activeTab === 'encargos' ? '1px solid #ff1e2d' : '1px solid #1f1f26',
            padding: '10px 16px',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '0.75rem',
            letterSpacing: '1.5px',
            fontWeight: 'bold'
          }}
        >
          ENCARGOS ({productosEncargos.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pedidos')}
          style={{
            background: activeTab === 'pedidos' ? '#ff1e2d' : '#0e0e12',
            color: '#fff',
            border: activeTab === 'pedidos' ? '1px solid #ff1e2d' : '1px solid #1f1f26',
            padding: '10px 16px',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '0.75rem',
            letterSpacing: '1.5px',
            fontWeight: 'bold'
          }}
        >
          PEDIDOS ({pedidos.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('estadisticas')}
          style={{
            background: activeTab === 'estadisticas' ? '#ff1e2d' : '#0e0e12',
            color: '#fff',
            border: activeTab === 'estadisticas' ? '1px solid #ff1e2d' : '1px solid #1f1f26',
            padding: '10px 16px',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '0.75rem',
            letterSpacing: '1.5px',
            fontWeight: 'bold'
          }}
        >
          ESTADÍSTICAS
        </button>
      </div>

      {error && <div style={{ background: '#260d0d', color: '#ff6b6b', padding: '10px', marginBottom: '15px', border: '1px solid #4a1515', fontSize: '0.85rem' }}>{error}</div>}
      {exito && <div style={{ background: '#0d2614', color: '#51cf66', padding: '10px', marginBottom: '15px', border: '1px solid #154a22', fontSize: '0.85rem' }}>{exito}</div>}

      {/* FORMULARIO DE AGREGAR PRODUCTO */}
      {activeTab === 'agregar' && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#0e0e12', padding: '15px', border: '1px solid #1f1f26', borderRadius: '2px' }}>
            <label style={{ fontSize: '0.7rem', letterSpacing: '1.5px', color: '#ff1e2d', fontWeight: 'bold' }}>DESTINO DEL ARTÍCULO:</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setTipoProducto('stock')}
                style={{
                  flex: 1,
                  background: tipoProducto === 'stock' ? '#ff1e2d' : '#16161c',
                  color: '#fff',
                  border: '1px solid',
                  borderColor: tipoProducto === 'stock' ? '#ff1e2d' : '#2a2a35',
                  padding: '10px',
                  borderRadius: '2px',
                  fontWeight: 'bold',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  letterSpacing: '1px'
                }}
              >
                📦 STOCK NORMAL
              </button>
              <button
                type="button"
                onClick={() => setTipoProducto('encargo')}
                style={{
                  flex: 1,
                  background: tipoProducto === 'encargo' ? '#ff1e2d' : '#16161c',
                  color: '#fff',
                  border: '1px solid',
                  borderColor: tipoProducto === 'encargo' ? '#ff1e2d' : '#2a2a35',
                  padding: '10px',
                  borderRadius: '2px',
                  fontWeight: 'bold',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  letterSpacing: '1px'
                }}
              >
                🏷️ ENCARGO
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.7rem', letterSpacing: '1.5px', color: '#888' }}>NOMBRE DEL PRODUCTO</label>
            <input 
              type="text" 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              required 
              style={{ width: '100%', padding: '12px', background: '#0e0e12', border: '1px solid #1f1f26', borderRadius: '2px', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.7rem', letterSpacing: '1.5px', color: '#888' }}>PRECIO (USD)</label>
            <input 
              type="number" 
              value={precio} 
              onChange={(e) => setPrecio(e.target.value)} 
              required 
              style={{ width: '100%', padding: '12px', background: '#0e0e12', border: '1px solid #1f1f26', borderRadius: '2px', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.7rem', letterSpacing: '1.5px', color: '#888' }}>CATEGORÍA</label>
            <select 
              value={categoria} 
              onChange={(e) => setCategoria(e.target.value)}
              style={{ width: '100%', padding: '12px', background: '#0e0e12', border: '1px solid #1f1f26', borderRadius: '2px', color: '#fff', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="ROPA">ROPA</option>
              <option value="PERFUMES">PERFUMES</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.7rem', letterSpacing: '1.5px', color: '#888' }}>SUBCATEGORÍA</label>
            <select 
              value={subcategoria} 
              onChange={(e) => setSubcategoria(e.target.value)}
              style={{ width: '100%', padding: '12px', background: '#0e0e12', border: '1px solid #1f1f26', borderRadius: '2px', color: '#fff', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
            >
              {categoria === 'ROPA' ? (
                <>
                  <option value="REMERAS">REMERAS</option>
                  <option value="SNEAKERS">SNEAKERS</option>
                  <option value="BUZOS">BUZOS</option>
                  <option value="SHORTS">SHORTS</option>
                  <option value="CAMPERAS">CAMPERAS</option>
                </>
              ) : (
                <>
                  <option value="HOMBRE">HOMBRE</option>
                  <option value="MUJER">MUJER</option>
                </>
              )}
            </select>
          </div>

          {categoria !== 'PERFUMES' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.7rem', letterSpacing: '1.5px', color: '#888' }}>TALLES DISPONIBLES</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {tallesDisponibles.map((talle) => {
                  const activo = tallesSeleccionados.includes(talle);
                  return (
                    <button
                      key={talle}
                      type="button"
                      onClick={() => toggleTalle(talle)}
                      style={{
                        width: '45px',
                        height: '42px',
                        background: activo ? '#ff1e2d' : '#0e0e12',
                        color: '#fff',
                        border: activo ? '1px solid #ff1e2d' : '1px solid #1f1f26',
                        borderRadius: '2px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      {talle}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.7rem', letterSpacing: '1.5px', color: '#888' }}>TAG</label>
            <input 
              type="text" 
              value={tag} 
              onChange={(e) => setTag(e.target.value)} 
              style={{ width: '100%', padding: '12px', background: '#0e0e12', border: '1px solid #1f1f26', borderRadius: '2px', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.7rem', letterSpacing: '1.5px', color: '#888' }}>IMAGEN FRENTE</label>
            <div style={{ border: '1px dashed #2a2a35', padding: '20px', textAlign: 'center', background: '#09090c', borderRadius: '2px' }}>
              <p style={{ color: '#777', fontSize: '0.8rem', marginBottom: '8px' }}>
                {imagenFrenteFile ? imagenFrenteFile.name : 'Arrastra tu imagen aquí'}
              </p>
              <label style={{ background: '#16161c', color: '#fff', padding: '8px 16px', borderRadius: '2px', cursor: 'pointer', fontSize: '0.75rem', border: '1px solid #2f2f3d', display: 'inline-block' }}>
                Buscar en archivos
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setImagenFrenteFile(e.target.files[0])} 
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.7rem', letterSpacing: '1.5px', color: '#888' }}>IMAGEN ESPALDA (Opcional)</label>
            <div style={{ border: '1px dashed #2a2a35', padding: '20px', textAlign: 'center', background: '#09090c', borderRadius: '2px' }}>
              <p style={{ color: '#777', fontSize: '0.8rem', marginBottom: '8px' }}>
                {imagenEspaldaFile ? imagenEspaldaFile.name : 'Arrastra tu imagen aquí'}
              </p>
              <label style={{ background: '#16161c', color: '#fff', padding: '8px 16px', borderRadius: '2px', cursor: 'pointer', fontSize: '0.75rem', border: '1px solid #2f2f3d', display: 'inline-block' }}>
                Buscar en archivos
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setImagenEspaldaFile(e.target.files[0])} 
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ background: '#ff1e2d', color: '#fff', padding: '14px', border: 'none', borderRadius: '2px', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '2px', fontSize: '0.85rem', marginTop: '10px' }}
          >
            {loading ? 'PUBLICANDO...' : 'PUBLICAR ARTÍCULO'}
          </button>
        </form>
      )}

      {/* LISTADO DE STOCK EN TIENDA */}
      {activeTab === 'stock' && (
        <div>
          <h3 style={{ fontSize: '1rem', letterSpacing: '1.5px', marginBottom: '20px' }}>INVENTARIO STOCK EN TIENDA ({productosStock.length})</h3>
          {productosStock.length === 0 ? (
            <p style={{ color: '#777', fontSize: '0.85rem' }}>No hay productos de stock cargados en el sistema.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
              {productosStock.map((prod) => (
                <div key={prod.id} style={{ border: '1px solid #1f1f26', padding: '10px', borderRadius: '2px', background: '#0e0e12', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    {prod.imagenUrl ? (
                      <img src={prod.imagenUrl} alt={prod.nombre} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '2px', marginBottom: '8px' }} />
                    ) : (
                      <div style={{ width: '100%', height: '140px', background: '#16161c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '11px', marginBottom: '8px' }}>Sin imagen</div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.65rem', background: '#ff1e2d', color: '#fff', padding: '2px 6px', borderRadius: '2px' }}>
                        STOCK
                      </span>
                    </div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px', color: '#fff' }}>{prod.nombre}</h4>
                    <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>{prod.categoria} / {prod.subcategoria}</p>
                    <p style={{ fontSize: '0.85rem', color: '#ff1e2d', fontWeight: 'bold', marginBottom: '10px' }}>${Number(prod.precio || 0).toLocaleString()} USD</p>
                  </div>
                  <button 
                    onClick={() => eliminarProducto(prod.id)}
                    style={{ background: 'transparent', color: '#ff4d4d', border: '1px solid #4a1515', padding: '6px', borderRadius: '2px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem', letterSpacing: '1px', width: '100%' }}
                  >
                    ELIMINAR
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LISTADO DE CATÁLOGO DE ENCARGOS */}
      {activeTab === 'encargos' && (
        <div>
          <h3 style={{ fontSize: '1rem', letterSpacing: '1.5px', marginBottom: '20px' }}>CATÁLOGO DE ENCARGOS ({productosEncargos.length})</h3>
          {productosEncargos.length === 0 ? (
            <p style={{ color: '#777', fontSize: '0.85rem' }}>No hay artículos de encargo cargados en el sistema.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
              {productosEncargos.map((prod) => (
                <div key={prod.id} style={{ border: '1px solid #1f1f26', padding: '10px', borderRadius: '2px', background: '#0e0e12', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    {prod.imagenUrl ? (
                      <img src={prod.imagenUrl} alt={prod.nombre} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '2px', marginBottom: '8px' }} />
                    ) : (
                      <div style={{ width: '100%', height: '140px', background: '#16161c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '11px', marginBottom: '8px' }}>Sin imagen</div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.65rem', background: '#222', color: '#fff', padding: '2px 6px', borderRadius: '2px', border: '1px solid #333' }}>
                        ENCARGO
                      </span>
                    </div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px', color: '#fff' }}>{prod.nombre}</h4>
                    <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>{prod.categoria} / {prod.subcategoria}</p>
                    <p style={{ fontSize: '0.85rem', color: '#ff1e2d', fontWeight: 'bold', marginBottom: '10px' }}>${Number(prod.precio || 0).toLocaleString()} USD</p>
                  </div>
                  <button 
                    onClick={() => eliminarProducto(prod.id)}
                    style={{ background: 'transparent', color: '#ff4d4d', border: '1px solid #4a1515', padding: '6px', borderRadius: '2px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem', letterSpacing: '1px', width: '100%' }}
                  >
                    ELIMINAR
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GESTIÓN DE PEDIDOS */}
      {activeTab === 'pedidos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1rem', letterSpacing: '1.5px', marginBottom: '10px' }}>LISTADO DE PEDIDOS ({pedidos.length})</h3>
          
          {pedidos.length === 0 ? (
            <p style={{ color: '#777', fontSize: '0.85rem' }}>No hay pedidos registrados todavía.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {pedidos.map((pedido) => {
                const estadoActual = (pedido.estado || 'pedido').toLowerCase();
                return (
                  <div key={pedido.id} style={{ background: '#0e0e12', border: '1px solid #1f1f26', padding: '16px', borderRadius: '2px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#ff1e2d', letterSpacing: '1px' }}>PEDIDO / ID: {pedido.id.slice(0, 8)}...</span>
                        <h4 style={{ fontSize: '0.95rem', color: '#fff', marginTop: '2px' }}>{pedido.nombre || pedido.cliente || 'Cliente sin nombre'}</h4>
                        <p style={{ fontSize: '0.8rem', color: '#888' }}>{pedido.email || 'Sin email'} {pedido.telefono ? `| ${pedido.telefono}` : ''}</p>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.7rem', color: '#888', display: 'block' }}>TOTAL ORDEN</span>
                        <span style={{ fontSize: '1.1rem', color: '#ff1e2d', fontWeight: 'bold' }}>${calcularMontoPedido(pedido).toLocaleString()} USD</span>
                      </div>
                    </div>

                    <div style={{ background: '#08080a', padding: '10px', borderRadius: '2px', border: '1px solid #16161c' }}>
                      <span style={{ fontSize: '0.65rem', color: '#666', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>ARTÍCULOS SOLICITADOS:</span>
                      {pedido.cart && pedido.cart.map((item, idx) => (
                        <div key={idx} style={{ fontSize: '0.8rem', color: '#ccc', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span>• {item.nombre} {item.selectedSize ? `(Talle: ${item.selectedSize})` : ''} x{item.quantity || 1}</span>
                          <span style={{ color: '#888' }}>${Number(item.precio || item.price || 0) * (item.quantity || 1)} USD</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
                      <label style={{ fontSize: '0.7rem', letterSpacing: '1px', color: '#888' }}>ESTADO DEL PEDIDO:</label>
                      <select
                        value={estadoActual}
                        onChange={(e) => handleCambiarEstadoPedido(pedido.id, e.target.value)}
                        style={{
                          background: '#16161c',
                          color: '#fff',
                          border: '1px solid #2f2f3d',
                          padding: '8px 12px',
                          borderRadius: '2px',
                          fontSize: '0.8rem',
                          outline: 'none',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          letterSpacing: '1px'
                        }}
                      >
                        <option value="pedido">PEDIDO</option>
                        <option value="abonado">ABONADO</option>
                        <option value="enviado">ENVIADO</option>
                        <option value="recibido/entregado">RECIBIDO / ENTREGADO</option>
                      </select>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA: ESTADÍSTICAS */}
      {activeTab === 'estadisticas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '1rem', letterSpacing: '1.5px' }}>MÉTRICAS Y VENTAS</h3>
            
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {[
                { id: '3d', label: '3 DÍAS' },
                { id: '7d', label: '7 DÍAS' },
                { id: '15d', label: '15 DÍAS' },
                { id: '30d', label: '30 DÍAS' },
                { id: '6m', label: '6 MESES' },
                { id: '12m', label: '12 MESES' },
                { id: 'todos', label: 'HISTÓRICO' }
              ].map((per) => (
                <button
                  key={per.id}
                  type="button"
                  onClick={() => setPeriodoEstadistica(per.id)}
                  style={{
                    background: periodoEstadistica === per.id ? '#ff1e2d' : '#0e0e12',
                    color: '#fff',
                    border: periodoEstadistica === per.id ? '1px solid #ff1e2d' : '1px solid #1f1f26',
                    padding: '6px 10px',
                    borderRadius: '2px',
                    fontSize: '0.65rem',
                    letterSpacing: '1px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {per.label}
                </button>
              ))}
            </div>
          </div>

          <p style={{ fontSize: '0.75rem', color: '#777', fontStyle: 'italic' }}>
            * Nota: Las métricas contabilizan pedidos finalizados (estado <b>RECIBIDO / ENTREGADO</b>) dentro del período filtrado.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
            <div style={{ background: '#0e0e12', border: '1px solid #1f1f26', padding: '20px', borderRadius: '2px' }}>
              <span style={{ fontSize: '0.7rem', color: '#888', letterSpacing: '1px' }}>TOTAL VENTAS (USD)</span>
              <h4 style={{ fontSize: '2rem', color: '#ff1e2d', marginTop: '5px' }}>${totalVentasUSD.toLocaleString()}</h4>
            </div>

            <div style={{ background: '#0e0e12', border: '1px solid #1f1f26', padding: '20px', borderRadius: '2px' }}>
              <span style={{ fontSize: '0.7rem', color: '#888', letterSpacing: '1px' }}>PEDIDOS ENTREGADOS</span>
              <h4 style={{ fontSize: '2rem', color: '#fff', marginTop: '5px' }}>{totalPedidosCompletados}</h4>
            </div>

            <div style={{ background: '#0e0e12', border: '1px solid #1f1f26', padding: '20px', borderRadius: '2px' }}>
              <span style={{ fontSize: '0.7rem', color: '#888', letterSpacing: '1px' }}>STOCK EN TIENDA</span>
              <h4 style={{ fontSize: '2rem', color: '#fff', marginTop: '5px' }}>{productosStock.length}</h4>
            </div>

            <div style={{ background: '#0e0e12', border: '1px solid #1f1f26', padding: '20px', borderRadius: '2px' }}>
              <span style={{ fontSize: '0.7rem', color: '#888', letterSpacing: '1px' }}>CATÁLOGO ENCARGOS</span>
              <h4 style={{ fontSize: '2rem', color: '#fff', marginTop: '5px' }}>{productosEncargos.length}</h4>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}