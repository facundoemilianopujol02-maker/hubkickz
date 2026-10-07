import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';

// Subcomponente para manejar el efecto hover y cambio de imagen individualmente
function EncargoCard({ producto, onSolicitar }) {
  const [isHovered, setIsHovered] = useState(false);

  // Recolectar todas las imágenes disponibles del producto
  const rawImagenes = [
    producto.imagenUrl,
    producto.imagenEspaldaUrl,
    ...(Array.isArray(producto.imagenes) ? producto.imagenes : []),
    producto.imagen,
    producto.segundaImagen
  ].filter(Boolean);

  const imagenes = [...new Set(rawImagenes)];
  const imgPrimary = imagenes[0] || '';
  const imgHover = imagenes[1] || imgPrimary;
  const hasMultipleImages = imagenes.length > 1;

  const precioMostrado = producto.precio || producto.precioUSD || 0;
  const descripcionMostrada = producto.descripcion || `${producto.subcategoria || ''} ${producto.tag ? `- Tag: ${producto.tag}` : ''}`.trim() || 'Disponible bajo pedido.';

  return (
    <div
      style={{
        background: '#0b0b0e',
        border: '1px solid #1a1a22',
        borderRadius: '4px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, border-color 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#ff1e2d';
        e.currentTarget.style.transform = 'translateY(-4px)';
        setIsHovered(true);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#1a1a22';
        e.currentTarget.style.transform = 'translateY(0)';
        setIsHovered(false);
      }}
    >
      {/* Contenedor de imágenes con animación y cambio a la segunda foto */}
      <div style={{ height: '220px', overflow: 'hidden', background: '#000', position: 'relative' }}>
        {imgPrimary ? (
          <>
            <img
              src={imgPrimary}
              alt={producto.nombre}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                position: 'absolute',
                top: 0,
                left: 0,
                opacity: hasMultipleImages && isHovered ? 0 : 0.85,
                transform: !hasMultipleImages && isHovered ? 'scale(1.05)' : 'scale(1)',
                transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out'
              }}
            />
            {hasMultipleImages && (
              <img
                src={imgHover}
                alt={`${producto.nombre} - Espalda`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  opacity: isHovered ? 0.85 : 0,
                  transition: 'opacity 0.4s ease-in-out'
                }}
              />
            )}
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '12px' }}>
            Sin imagen
          </div>
        )}
        <span style={{ position: 'absolute', top: '10px', right: '10px', background: '#ff1e2d', color: '#fff', fontSize: '0.65rem', padding: '3px 8px', borderRadius: '2px', letterSpacing: '1px', zIndex: 2 }}>
          ENCARGO
        </span>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '0.65rem', color: '#777', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>
            {producto.categoria || 'GENERAL'}
          </span>
          <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '8px', lineHeight: '1.4' }}>
            {producto.nombre}
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '15px', lineHeight: '1.5' }}>
            {descripcionMostrada}
          </p>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <span style={{ fontSize: '0.75rem', color: '#888' }}>Precio Estimado:</span>
            <span style={{ fontSize: '1.1rem', color: '#ff1e2d', fontWeight: 'bold' }}>USD {precioMostrado}</span>
          </div>

          <button
            type="button"
            onClick={() => onSolicitar(producto)}
            style={{
              width: '100%',
              background: '#fff',
              color: '#000',
              border: 'none',
              padding: '10px',
              borderRadius: '2px',
              fontWeight: 'bold',
              fontSize: '0.75rem',
              letterSpacing: '1.5px',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#ff1e2d'}
            onMouseLeave={(e) => e.target.style.background = '#fff'}
          >
            SOLICITAR ENCARGO
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Encargos() {
  const [productosEncargos, setProductosEncargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [talleElegido, setTalleElegido] = useState('');
  const [enviado, setEnviado] = useState(false);

  // Escuchar en tiempo real la colección de productos desde Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'productos'),
      (snapshot) => {
        const docs = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((p) => p.tipo === 'encargo'); // Filtra únicamente los cargados para encargo
        setProductosEncargos(docs);
        setLoading(false);
      },
      (error) => {
        console.error('Error al cargar encargos desde Firestore:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filtrar productos según categoría seleccionada y buscador
  const productosFiltrados = productosEncargos.filter((item) => {
    const cat = (item.categoria || '').toUpperCase();
    const coincideCat = categoriaSeleccionada === 'TODOS' || cat === categoriaSeleccionada.toUpperCase();
    const coincideBusqueda = (item.nombre || '').toLowerCase().includes(busqueda.toLowerCase());
    return coincideCat && coincideBusqueda;
  });

  const handleConsultarWhatsApp = (e) => {
    e.preventDefault();
    if (!productoSeleccionado) return;

    const precio = productoSeleccionado.precio || productoSeleccionado.precioUSD || 0;
    const mensaje = `¡Hola HubKickz! 👋 Me interesa hacer un encargo personalizado del siguiente producto:%0A%0A*${productoSeleccionado.nombre}*%0A- Categoría: ${productoSeleccionado.categoria || 'ROPA'}%0A- Precio estimado: USD ${precio}%0A- Talle/Detalle: ${talleElegido || 'No especificado'}%0A%0A¿Me podrían confirmar disponibilidad y pasos para avanzar?`;
    
    window.open(`https://wa.me/543794123456?text=${mensaje}`, '_blank');
    setEnviado(true);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px', fontFamily: 'monospace, sans-serif', color: '#ccc' }}>
      
      {/* Cabecera de la sección */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '2rem', color: '#fff', fontFamily: 'serif', letterSpacing: '2px', marginBottom: '10px' }}>
          CATÁLOGO DE <span style={{ color: '#ff1e2d' }}>ENCARGOS</span>
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#888', maxWidth: '600px', margin: '0 auto' }}>
          ¿Buscás un modelo, talle o edición limitada que no está en stock? Explorá nuestro catálogo de encargos internacionales o consultanos por tu pieza soñada.
        </p>
      </div>

      {/* Barra de Filtros y Buscador */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '15px', marginBottom: '30px', borderBottom: '1px solid #1f1f26', paddingBottom: '20px' }}>
        
        {/* Categorías */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {['TODOS', 'SNEAKERS', 'ROPA', 'PERFUMES'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoriaSeleccionada(cat)}
              style={{
                background: categoriaSeleccionada === cat ? '#ff1e2d' : '#0e0e12',
                color: categoriaSeleccionada === cat ? '#fff' : '#aaa',
                border: '1px solid',
                borderColor: categoriaSeleccionada === cat ? '#ff1e2d' : '#1f1f26',
                padding: '8px 16px',
                borderRadius: '2px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                letterSpacing: '1px',
                transition: 'all 0.2s'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Buscador */}
        <div>
          <input
            type="text"
            placeholder="Buscar encargo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              background: '#0e0e12',
              border: '1px solid #1f1f26',
              color: '#fff',
              padding: '8px 14px',
              borderRadius: '2px',
              fontSize: '0.8rem',
              outline: 'none',
              width: '220px'
            }}
          />
        </div>
      </div>

      {/* Grilla de Productos de Encargo desde Firebase */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#888' }}>
          Cargando catálogo de encargos...
        </div>
      ) : productosFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#777' }}>
          No hay productos publicados para encargar en esta categoría.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '25px' }}>
          {productosFiltrados.map((producto) => (
            <EncargoCard
              key={producto.id}
              producto={producto}
              onSolicitar={(prod) => {
                setProductoSeleccionado(prod);
                setTalleElegido('');
                setEnviado(false);
              }}
            />
          ))}
        </div>
      )}

      {/* Modal para solicitar el encargo específico */}
      {productoSeleccionado && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ background: '#0e0e12', border: '1px solid #22222a', width: '100%', maxWidth: '450px', padding: '30px', borderRadius: '4px', position: 'relative' }}>
            
            <button
              type="button"
              onClick={() => setProductoSeleccionado(null)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
            >
              ✕
            </button>

            <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '10px', fontFamily: 'serif' }}>
              Gestionar Encargo
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '20px' }}>
              Estás solicitando: <strong style={{ color: '#fff' }}>{productoSeleccionado.nombre}</strong>
            </p>

            <form onSubmit={handleConsultarWhatsApp} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '6px', letterSpacing: '1px' }}>
                  ESPECIFICAR TALLE / MEDIDA / COLOR:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: US 10 / Talle L / Color Negro"
                  value={talleElegido}
                  onChange={(e) => setTalleElegido(e.target.value)}
                  style={{ width: '100%', background: '#0b0b0e', border: '1px solid #222', color: '#fff', padding: '10px', borderRadius: '2px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ background: '#121218', padding: '12px', borderRadius: '2px', fontSize: '0.8rem', color: '#888', lineHeight: '1.5' }}>
                ℹ️ Al hacer clic en continuar, se abrirá tu WhatsApp directamente con los detalles del producto para coordinar la cotización oficial y el pago.
              </div>

              <button
                type="submit"
                style={{
                  background: '#ff1e2d',
                  color: '#fff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '2px',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  letterSpacing: '1.5px',
                  cursor: 'pointer'
                }}
              >
                ENVIAR CONSULTA POR WHATSAPP 📲
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}