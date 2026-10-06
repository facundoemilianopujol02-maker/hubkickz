import React, { useState } from 'react';

export default function Encargos() {
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    producto: '',
    talle: '',
    detalles: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Reemplazá este número con tu número real de WhatsApp (formato internacional sin el +)
    const telefonoNegocio = '5493794000000'; 
    
    const texto = `¡Hola HUB KICKZ! Quiero hacer un encargo bajo pedido:
- *Nombre:* ${formData.nombre}
- *Teléfono:* ${formData.telefono}
- *Producto / Modelo:* ${formData.producto}
- *Talle:* ${formData.talle}
- *Detalles / Colorway:* ${formData.detalles}`;

    const url = `https://wa.me/${telefonoNegocio}?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  return (
    <section className="catalog-section" style={{ maxWidth: '700px', margin: '40px auto', padding: '0 20px' }}>
      <div className="section-title-wrap" style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2>ENCARGOS PERSONALIZADOS</h2>
        <p className="subtitle-text">
          ¿Buscás un modelo exclusivo de zapas, una prenda o un perfume que no tenemos en stock? Encárgalo con nosotros y te lo conseguimos 100% original.
        </p>
      </div>

      <form 
        onSubmit={handleSubmit}
        style={{
          background: '#08080a',
          border: '1px solid #1a1a20',
          borderRadius: '4px',
          padding: '30px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          fontFamily: 'monospace, sans-serif',
          color: '#fff'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.75rem', letterSpacing: '1px', color: '#888' }}>TU NOMBRE Y APELLIDO:</label>
          <input 
            type="text" 
            name="nombre" 
            required 
            value={formData.nombre} 
            onChange={handleChange}
            placeholder="Ej: Carlos Gómez"
            style={{ background: '#0e0e12', border: '1px solid #222', padding: '12px', color: '#fff', borderRadius: '2px', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.75rem', letterSpacing: '1px', color: '#888' }}>TELÉFONO / CELULAR:</label>
          <input 
            type="tel" 
            name="telefono" 
            required 
            value={formData.telefono} 
            onChange={handleChange}
            placeholder="Ej: 3794123456"
            style={{ background: '#0e0e12', border: '1px solid #222', padding: '12px', color: '#fff', borderRadius: '2px', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.75rem', letterSpacing: '1px', color: '#888' }}>PRODUCTO / MODELO:</label>
            <input 
              type="text" 
              name="producto" 
              required 
              value={formData.producto} 
              onChange={handleChange}
              placeholder="Ej: Nike Dunk Low Retro"
              style={{ background: '#0e0e12', border: '1px solid #222', padding: '12px', color: '#fff', borderRadius: '2px', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.75rem', letterSpacing: '1px', color: '#888' }}>TALLE:</label>
            <input 
              type="text" 
              name="talle" 
              required 
              value={formData.talle} 
              onChange={handleChange}
              placeholder="Ej: 41.5 / US 9.5"
              style={{ background: '#0e0e12', border: '1px solid #222', padding: '12px', color: '#fff', borderRadius: '2px', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.75rem', letterSpacing: '1px', color: '#888' }}>DETALLES ESPECÍFICOS (Colorway, edición, etc.):</label>
          <textarea 
            name="detalles" 
            rows="3"
            value={formData.detalles} 
            onChange={handleChange}
            placeholder="Ej: Busco la combinación White/Black en buen estado o nuevo."
            style={{ background: '#0e0e12', border: '1px solid #222', padding: '12px', color: '#fff', borderRadius: '2px', outline: 'none', resize: 'vertical' }}
          />
        </div>

        <button 
          type="submit"
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
            marginTop: '10px'
          }}
        >
          ENVIAR ENCARGO POR WHATSAPP
        </button>
      </form>
    </section>
  );
}