import React from 'react';

export default function NoticeModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="notice-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Lado izquierdo: Imagen de zapatillas */}
        <div className="notice-modal-image-side">
          <img 
            src="https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80" 
            alt="Sneakers USD Notice" 
          />
        </div>

        {/* Lado derecho: Mensaje y Acción */}
        <div className="notice-modal-content-side">
          <h2 className="notice-title">
            Los precios están expresados en USD
          </h2>
          <p className="notice-description">
            Al finalizar tu compra, podés elegir abonar en <strong>pesos argentinos</strong> al dólar oficial seleccionando Mercado Pago como medio de pago.
          </p>
          <button className="notice-btn-understood" onClick={onClose}>
            ENTENDIDO
          </button>
        </div>
      </div>
    </div>
  );
}