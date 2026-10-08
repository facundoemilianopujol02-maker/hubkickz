import React, { useState } from 'react';

export default function ProductDetailModal({ product, onClose, onAddToCart }) {
  const [selectedSize, setSelectedSize] = useState('');
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  
  // Estado para controlar la imagen seleccionada en pantalla completa dentro de la página
  const [imagenAmpliada, setImagenAmpliada] = useState(null);

  if (!product) return null;

  const imagenes = product.imagenes && product.imagenes.length > 0 
    ? product.imagenes 
    : [product.imagenUrl, product.imagenEspaldaUrl].filter(Boolean);

  const handleAdd = () => {
    if (product.categoria !== 'PERFUMES' && product.talles && product.talles.length > 0 && !selectedSize) {
      setError('Por favor, selecciona un talle.');
      return;
    }
    setError('');
    onAddToCart(product, selectedSize, qty);
    onClose();
  };

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '15px',
        boxSizing: 'border-box'
      }}
    >
      {/* MODAL INTERNO PARA AMPLIAR FOTO DE PRODUCTO EN LA MISMA PÁGINA */}
      {imagenAmpliada && (
        <div 
          onClick={() => setImagenAmpliada(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 99999,
            padding: '15px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <button 
              type="button"
              onClick={() => setImagenAmpliada(null)}
              style={{
                position: 'absolute',
                top: '-45px',
                right: '0px',
                background: '#ff1e2d',
                color: '#fff',
                border: 'none',
                borderRadius: '2px',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem'
              }}
            >
              ✕
            </button>
            <img 
              src={imagenAmpliada} 
              alt="Vista ampliada" 
              style={{ maxWidth: '100vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: '2px' }} 
            />
          </div>
        </div>
      )}

      {/* CONTENEDOR PRINCIPAL DEL MODAL DE PRODUCTO */}
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#0b0b0e',
          border: '1px solid #1f1f26',
          borderRadius: '4px',
          width: '100%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '25px',
          color: '#ccc',
          fontFamily: 'monospace, sans-serif',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
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
            color: '#fff',
            fontSize: '1.2rem',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          
          {/* GALERÍA DE FOTOS CLICKEABLES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {imagenes.length > 0 ? (
              imagenes.map((imgUrl, index) => (
                <div 
                  key={index}
                  onClick={() => setImagenAmpliada(imgUrl)}
                  style={{ cursor: 'pointer', position: 'relative', border: '1px solid #1f1f26', borderRadius: '2px', overflow: 'hidden', background: '#0e0e12' }}
                  title="Hacer clic para ampliar imagen"
                >
                  <img 
                    src={imgUrl} 
                    alt={`${product.nombre} ${index}`} 
                    style={{ width: '100%', height: '260px', objectFit: 'cover', display: 'block' }} 
                  />
                  <span style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: '0.65rem', padding: '4px 8px', borderRadius: '2px', letterSpacing: '1px' }}>
                    🔍 AMPLIAR
                  </span>
                </div>
              ))
            ) : (
              <div style={{ width: '100%', height: '260px', background: '#0e0e12', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                Sin imagen
              </div>
            )}
          </div>

          {/* INFORMACIÓN Y ACCIONES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#ff1e2d', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                {product.categoria} / {product.subcategoria}
              </span>
              <h2 style={{ fontSize: '1.4rem', color: '#fff', fontFamily: 'serif', marginTop: '4px', letterSpacing: '0.5px' }}>
                {product.nombre}
              </h2>
              <p style={{ fontSize: '1.2rem', color: '#ff1e2d', fontWeight: 'bold', marginTop: '8px' }}>
                ${Number(product.precio || product.price || 0).toLocaleString()} USD
              </p>
            </div>

            {error && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#f87171', borderRadius: '2px', fontSize: '0.8rem' }}>
                {error}
              </div>
            )}

            {/* SELECCIÓN DE TALLES */}
            {product.categoria !== 'PERFUMES' && product.talles && product.talles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', color: '#aaa', letterSpacing: '1px' }}>SELECCIONAR TALLE:</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {product.talles.map((talle) => {
                    const isSelected = selectedSize === talle;
                    return (
                      <button
                        key={talle}
                        type="button"
                        onClick={() => setSelectedSize(talle)}
                        style={{
                          padding: '8px 14px',
                          background: isSelected ? '#ff1e2d' : '#0e0e12',
                          color: '#fff',
                          border: isSelected ? '1px solid #ff1e2d' : '1px solid #1f1f26',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '0.8rem'
                        }}
                      >
                        {talle}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CANTIDAD */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.75rem', color: '#aaa', letterSpacing: '1px' }}>CANTIDAD:</label>
              <input 
                type="number" 
                min="1" 
                value={qty} 
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ width: '80px', padding: '10px', background: '#0e0e12', border: '1px solid #1f1f26', color: '#fff', borderRadius: '2px', fontFamily: 'monospace', fontSize: '0.9rem' }}
              />
            </div>

            <button
              type="button"
              onClick={handleAdd}
              style={{
                marginTop: '10px',
                background: '#ff1e2d',
                color: '#fff',
                border: 'none',
                padding: '14px',
                borderRadius: '2px',
                fontWeight: 'bold',
                letterSpacing: '1.5px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                transition: 'background 0.2s'
              }}
            >
              AGREGAR AL CARRITO
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}