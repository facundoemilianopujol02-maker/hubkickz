import React, { useState } from 'react';

export default function ProductCard({ product, onAddToCart, onSelectProduct, showQuickAdd = true }) {
  const getProductImages = () => {
    let rawList = [];

    if (Array.isArray(product.imagenes)) rawList.push(...product.imagenes);
    if (Array.isArray(product.images)) rawList.push(...product.images);
    if (product.imagenUrl) rawList.push(product.imagenUrl);
    if (product.imagen) rawList.push(product.imagen);
    if (product.segundaImagen) rawList.push(product.segundaImagen);
    if (product.imagenSecundaria) rawList.push(product.imagenSecundaria);
    if (product.foto) rawList.push(product.foto);
    if (product.fotoTrasera) rawList.push(product.fotoTrasera);

    const processedList = rawList.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        return item.url || item.src || item.imagen || item.imagenUrl || '';
      }
      return '';
    });

    return [...new Set(processedList.filter(Boolean))];
  };

  const imagenes = getProductImages();
  const imagePrimary = imagenes[0] || '';
  const imageHover = imagenes[1] || imagePrimary; 
  const hasMultipleImages = imagenes.length > 1;

  const [isHovered, setIsHovered] = useState(false);
  const talles = product.talles || product.sizes || ['Único'];

  return (
    <div 
      onClick={() => onSelectProduct && onSelectProduct(product)}
      style={{
        background: '#0e0e12',
        border: '1px solid #1a1a20',
        borderRadius: '4px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'border-color 0.2s ease',
        fontFamily: 'monospace, sans-serif',
        color: '#fff'
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#ff1e2d'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#1a1a20'}
    >
      {/* Contenedor de imágenes con fundido suave */}
      <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ 
          width: '100%', 
          height: '260px', 
          background: '#121216', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {imagePrimary ? (
          <>
            <img 
              src={imagePrimary} 
              alt={product.nombre} 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain',
                position: 'absolute',
                top: 0,
                left: 0,
                opacity: hasMultipleImages && isHovered ? 0 : 1,
                transform: !hasMultipleImages && isHovered ? 'scale(1.06)' : 'scale(1)',
                transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out'
              }} 
            />

            {hasMultipleImages && (
              <img 
                src={imageHover} 
                alt={`${product.nombre} - Dorso`} 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  opacity: isHovered ? 1 : 0,
                  transition: 'opacity 0.4s ease-in-out'
                }} 
              />
            )}
          </>
        ) : (
          <span style={{ color: '#555', fontSize: '12px' }}>Sin imagen</span>
        )}
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontSize: '9px', letterSpacing: '1.5px', color: '#ff1e2d', fontWeight: 'bold', textTransform: 'uppercase' }}>
          {product.badge || product.etiqueta || 'NEW DROP'}
        </div>
        
        <h3 style={{ fontSize: '0.95rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {product.nombre}
        </h3>

        <div style={{ fontSize: '1.2rem', fontFamily: 'serif', color: '#fff' }}>
          ${Number(product.precio || product.price || 0).toLocaleString()} <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#888' }}>USD</span>
        </div>

        {/* El botón se muestra en el catálogo, pero se oculta dentro del carrito si showQuickAdd={false} */}
        {showQuickAdd && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product, talles[0], 1);
            }}
            style={{
              background: '#ff1e2d',
              color: '#fff',
              border: 'none',
              padding: '10px',
              borderRadius: '2px',
              fontWeight: 'bold',
              fontSize: '0.75rem',
              letterSpacing: '1px',
              cursor: 'pointer',
              marginTop: '6px',
              width: '100%'
            }}
          >
            AGREGAR RÁPIDO
          </button>
        )}
      </div>
    </div>
  );
}