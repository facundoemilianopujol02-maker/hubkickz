import React, { useState } from 'react';

export default function ProductDetailModal({ product, onClose, onAddToCart }) {
  const talles = product.talles || product.sizes || ['Único'];
  const [selectedSize, setSelectedSize] = useState(talles[0] || 'Único');

  // Función robusta para recolectar todas las imágenes disponibles del producto
  const getImages = () => {
    let list = [];
    if (Array.isArray(product.imagenes)) list.push(...product.imagenes);
    if (Array.isArray(product.images)) list.push(...product.images);
    if (product.imagenUrl) list.push(product.imagenUrl);
    if (product.imagen) list.push(product.imagen);
    if (product.segundaImagen) list.push(product.segundaImagen);
    if (product.imagenSecundaria) list.push(product.imagenSecundaria);
    return [...new Set(list.filter(Boolean))];
  };

  const images = getImages();
  const [activeImg, setActiveImg] = useState(images[0] || '');

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        fontFamily: 'monospace, sans-serif'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '90%',
          maxWidth: '850px',
          backgroundColor: '#0c0c0f',
          border: '1px solid #1a1a20',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'row',
          position: 'relative',
          overflow: 'hidden',
          color: '#fff'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'none',
            border: 'none',
            color: '#aaa',
            fontSize: '1.2rem',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          ✕
        </button>

        {/* Galería y miniaturas (incluye foto trasera/secundaria) */}
        <div style={{ flex: 1, backgroundColor: '#121216', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {activeImg ? (
              <img 
                src={activeImg} 
                alt={product.nombre} 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  transition: 'opacity 0.25s ease-in-out' 
                }} 
              />
            ) : (
              <span style={{ color: '#555' }}>Sin imagen</span>
            )}
          </div>

          {/* Miniaturas para alternar entre vista frontal, trasera, etc. */}
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {images.map((img, idx) => (
                <img 
                  key={idx} 
                  src={img} 
                  alt={`Vista ${idx + 1}`} 
                  onClick={() => setActiveImg(img)}
                  style={{ 
                    width: '55px', 
                    height: '55px', 
                    objectFit: 'cover', 
                    cursor: 'pointer', 
                    borderRadius: '2px',
                    border: activeImg === img ? '2px solid #ff1e2d' : '1px solid #222',
                    opacity: activeImg === img ? 1 : 0.6,
                    transition: 'all 0.2s ease'
                  }} 
                />
              ))}
            </div>
          )}
        </div>

        {/* Detalles y Talles */}
        <div style={{ flex: 1, padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '10px', color: '#ff1e2d', letterSpacing: '1.5px', fontWeight: 'bold' }}>
              {product.badge || product.etiqueta || 'NEW DROP'}
            </span>
            <h2 style={{ fontSize: '1.3rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {product.nombre}
            </h2>
            <div style={{ fontSize: '1.5rem', fontFamily: 'serif' }}>
              ${Number(product.precio || product.price || 0).toLocaleString()} <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#888' }}>USD</span>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
              Categoría: <strong style={{ color: '#fff' }}>{product.categoria || product.category || 'ROPA'}</strong>
            </div>

            {/* Selector de Talles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <span style={{ fontSize: '0.75rem', letterSpacing: '1px', color: '#888' }}>
                TALLE SELECCIONADO: <strong style={{ color: '#fff' }}>{selectedSize}</strong>
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {talles.map((talle) => (
                  <button 
                    key={talle}
                    type="button"
                    onClick={() => setSelectedSize(talle)}
                    style={{
                      padding: '8px 14px',
                      background: selectedSize === talle ? '#ff1e2d' : '#121216',
                      color: '#fff',
                      border: '1px solid #222',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 'bold'
                    }}
                  >
                    {talle}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => {
              onAddToCart(product, selectedSize, 1);
              onClose();
            }}
            style={{
              background: '#ff1e2d',
              color: '#fff',
              border: 'none',
              padding: '14px',
              borderRadius: '2px',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              letterSpacing: '1.5px',
              cursor: 'pointer',
              width: '100%',
              marginTop: '10px'
            }}
          >
            AGREGAR AL CARRITO
          </button>
        </div>
      </div>
    </div>
  );
}