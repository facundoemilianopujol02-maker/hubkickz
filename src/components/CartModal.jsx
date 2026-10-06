import React from 'react';

export default function CartModal({ isOpen, onClose, cart, onUpdateQuantity, onSelectProduct, onGoToCheckout }) {
  if (!isOpen) return null;

  const totalUSD = cart.reduce(
    (sum, item) => sum + (Number(item.precio || item.price) || 0) * item.quantity,
    0
  );

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
        justifyContent: 'flex-end',
        zIndex: 9999,
        fontFamily: 'monospace, sans-serif'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '420px',
          height: '100%',
          backgroundColor: '#08080a',
          borderLeft: '1px solid #1a1a20',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          color: '#fff',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a20', paddingBottom: '16px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1rem', letterSpacing: '1px', margin: 0 }}>
            TU CARRITO ({cart.reduce((acc, i) => acc + i.quantity, 0)})
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        {cart.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#666', gap: '10px' }}>
            <p>Tu carrito está vacío.</p>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', paddingRight: '4px' }}>
            {cart.map((item, index) => {
              const itemImg = item.imagenUrl || item.imagen || (Array.isArray(item.imagenes) ? item.imagenes[0] : '') || '';
              return (
                <div 
                  key={`${item.id}-${item.selectedSize || index}`}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    background: '#0e0e12',
                    border: '1px solid #1a1a20',
                    padding: '12px',
                    borderRadius: '2px',
                    alignItems: 'center'
                  }}
                >
                  {itemImg ? (
                    <img 
                      src={itemImg} 
                      alt={item.nombre} 
                      onClick={() => onSelectProduct(item)}
                      style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '2px', background: '#121216', cursor: 'pointer' }} 
                    />
                  ) : (
                    <div style={{ width: '50px', height: '50px', background: '#121216', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#555' }}>Sin img</div>
                  )}
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <h4 onClick={() => onSelectProduct(item)} style={{ fontSize: '0.8rem', margin: 0, fontWeight: '600', cursor: 'pointer' }}>
                      {item.nombre}
                    </h4>
                    <span style={{ fontSize: '0.7rem', color: '#888' }}>Talle: <strong>{item.selectedSize || 'Único'}</strong></span>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.85rem', fontFamily: 'serif', color: '#fff' }}>
                        ${Number(item.precio || 0).toLocaleString()} USD
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #1a1a20', background: '#121216', borderRadius: '2px' }}>
                        <button type="button" onClick={() => onUpdateQuantity(item.id, item.selectedSize, item.quantity - 1)} style={{ background: 'none', border: 'none', color: '#fff', padding: '2px 8px', cursor: 'pointer', fontSize: '0.9rem' }}>-</button>
                        <span style={{ padding: '0 8px', fontSize: '0.8rem', fontWeight: 'bold' }}>{item.quantity}</span>
                        <button type="button" onClick={() => onUpdateQuantity(item.id, item.selectedSize, item.quantity + 1)} style={{ background: 'none', border: 'none', color: '#fff', padding: '2px 8px', cursor: 'pointer', fontSize: '0.9rem' }}>+</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {cart.length > 0 && (
          <div style={{ borderTop: '1px solid #1a1a20', paddingTop: '20px', marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#888', letterSpacing: '1px' }}>TOTAL ESTIMADO:</span>
              <span style={{ fontSize: '1.3rem', fontFamily: 'serif', color: '#fff' }}>${totalUSD.toLocaleString()} USD</span>
            </div>

            <button 
              type="button"
              onClick={() => {
                onClose();
                onGoToCheckout();
              }}
              style={{
                background: '#ff1e2d',
                color: '#fff',
                border: 'none',
                padding: '14px',
                borderRadius: '2px',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                letterSpacing: '1.5px',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              FINALIZAR COMPRA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}