import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function Checkout({ cart, totalAmount = 0, clearCart, onOrderSuccess }) {
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [customerInfo, setCustomerInfo] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: ''
  });
  const [comprobante, setComprobante] = useState(null);
  
  const [dolarRate, setDolarRate] = useState(null);
  const [loadingRate, setLoadingRate] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successModalMessage, setSuccessModalMessage] = useState(null);

  useEffect(() => {
    fetch('https://dolarapi.com/v1/dolares/blue')
      .then((res) => res.json())
      .then((data) => {
        setDolarRate(data.venta);
        setLoadingRate(false);
      })
      .catch((err) => {
        console.error('Error al obtener la cotización del dólar blue:', err);
        setDolarRate(1500);
        setLoadingRate(false);
      });
  }, []);

  const safeTotalUSD = Number(totalAmount) || 0;
  const totalARS = dolarRate ? safeTotalUSD * dolarRate : 0;

  const handleInputChange = (e) => {
    setCustomerInfo({
      ...customerInfo,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setComprobante(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const cleanData = (data) => {
    if (data === undefined) return null;
    if (data === null || typeof data !== 'object') return data;

    if (Array.isArray(data)) {
      return data.map(item => cleanData(item));
    }

    const cleanedObj = {};
    for (const key of Object.keys(data)) {
      const value = cleanData(data[key]);
      if (value !== undefined) {
        cleanedObj[key] = value;
      }
    }
    return cleanedObj;
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      setError('El carrito está vacío.');
      return;
    }

    if (paymentMethod === 'transferencia' && !comprobante) {
      setError('Por favor, adjunta el comprobante de la transferencia.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const estadoPedido = 
        paymentMethod === 'transferencia' ? 'Pendiente de Verificación' : 
        paymentMethod === 'tarjeta_naranjax' ? 'Pendiente de Coordinación de Pago' : 'Aprobado';

      const rawOrder = {
        cliente: customerInfo,
        items: cart,
        totalUSD: safeTotalUSD,
        cotizacionDolarUsada: dolarRate,
        tipoDolar: 'blue',
        totalARS: Number(totalARS.toFixed(2)),
        metodoPago: paymentMethod,
        comprobanteUrl: comprobante || null,
        estado: estadoPedido,
        createdAt: serverTimestamp()
      };

      const newOrder = cleanData(rawOrder);

      await addDoc(collection(db, 'pedidos'), newOrder);

      if (clearCart) clearCart();

      if (paymentMethod === 'tarjeta_naranjax') {
        setSuccessModalMessage('Nos pondremos en contacto a la brevedad para coordinar el pago. Muchas gracias.');
      } else if (paymentMethod === 'transferencia') {
        setSuccessModalMessage('¡Pedido registrado con éxito! Recibiremos tu comprobante para verificar la transferencia a la brevedad.');
      } else {
        setSuccessModalMessage('¡Pedido registrado con éxito! Te esperamos para el pago en efectivo al momento de la entrega o retiro.');
      }

    } catch (err) {
      console.error('Error al guardar el pedido:', err);
      setError('Ocurrió un error al procesar el pedido. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      maxWidth: '700px', 
      margin: '40px auto', 
      padding: '30px', 
      backgroundColor: '#0b0b0e', 
      border: '1px solid #1a1a22', 
      borderRadius: '4px', 
      color: '#ccc', 
      fontFamily: 'monospace, sans-serif' 
    }}>
      <style>{`
        .checkout-input {
          background-color: #0e0e12;
          border: 1px solid #1f1f26;
          color: #fff;
          padding: 12px;
          border-radius: 2px;
          font-family: monospace, sans-serif;
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }
        .checkout-input:focus {
          outline: none;
          border-color: #ff1e2d;
          box-shadow: 0 0 8px rgba(255, 30, 45, 0.2);
        }
        .payment-option {
          background-color: #0e0e12;
          border: 1px solid #1f1f26;
          border-radius: 2px;
          padding: 14px 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .payment-option:hover {
          border-color: #ff1e2d;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        .payment-option.selected {
          border-color: #ff1e2d;
          background-color: #121217;
        }
        .checkout-btn {
          background-color: #ff1e2d;
          color: #fff;
          border: none;
          padding: 14px;
          border-radius: 2px;
          font-family: monospace, sans-serif;
          font-size: 0.95rem;
          font-weight: bold;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .checkout-btn:hover:not(:disabled) {
          background-color: #e01625;
          transform: scale(1.01);
          box-shadow: 0 0 15px rgba(255, 30, 45, 0.4);
        }
        .checkout-btn:active:not(:disabled) {
          transform: scale(0.98);
        }
        .checkout-btn:disabled {
          background-color: #333;
          color: #777;
          cursor: not-allowed;
        }
      `}</style>

      {successModalMessage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#0b0b0e',
            border: '1px solid #ff1e2d',
            padding: '30px',
            borderRadius: '4px',
            maxWidth: '450px',
            width: '100%',
            textAlign: 'center',
            fontFamily: 'monospace, sans-serif',
            boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
          }}>
            <h3 style={{ color: '#ff1e2d', fontFamily: 'serif', fontSize: '1.3rem', marginBottom: '15px' }}>
              ¡PEDIDO REGISTRADO!
            </h3>
            <p style={{ color: '#ddd', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '25px' }}>
              {successModalMessage}
            </p>
            <button
              type="button"
              onClick={() => {
                setSuccessModalMessage(null);
                // Evitamos llamar a onOrderSuccess si este contenía alertas nativas.
                // Si necesitas redirigir, hazlo aquí sin usar alert().
              }}
              className="checkout-btn"
              style={{ width: '100%' }}
            >
              ENTENDIDO
            </button>
          </div>
        </div>
      )}

      <h2 style={{ 
        color: '#ff1e2d', 
        fontSize: '1.4rem', 
        fontFamily: 'serif', 
        letterSpacing: '1px', 
        marginBottom: '20px',
        borderBottom: '1px solid #1f1f26',
        paddingBottom: '12px'
      }}>
        FINALIZAR COMPRA
      </h2>

      {error && (
        <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#f87171', borderRadius: '2px', marginBottom: '20px', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmitOrder} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        {/* Datos del Cliente */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#fff', letterSpacing: '1.5px', textTransform: 'uppercase' }}>1. Datos del Cliente</h3>
          <input
            type="text"
            name="nombre"
            placeholder="Nombre Completo"
            value={customerInfo.nombre}
            onChange={handleInputChange}
            required
            className="checkout-input"
          />
          <input
            type="email"
            name="email"
            placeholder="Correo Electrónico"
            value={customerInfo.email}
            onChange={handleInputChange}
            required
            className="checkout-input"
          />
          <input
            type="tel"
            name="telefono"
            placeholder="Teléfono"
            value={customerInfo.telefono}
            onChange={handleInputChange}
            required
            className="checkout-input"
          />
          <input
            type="text"
            name="direccion"
            placeholder="Dirección de Envío"
            value={customerInfo.direccion}
            onChange={handleInputChange}
            required
            className="checkout-input"
          />
        </div>

        {/* Métodos de Pago */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#fff', letterSpacing: '1.5px', textTransform: 'uppercase' }}>2. Método de Pago</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            <label className={`payment-option ${paymentMethod === 'efectivo' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="metodoPago"
                value="efectivo"
                checked={paymentMethod === 'efectivo'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ accentColor: '#ff1e2d' }}
              />
              <div>
                <strong style={{ color: '#fff', fontSize: '0.9rem', letterSpacing: '0.5px' }}>Efectivo</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#888' }}>Pago al momento de la entrega o retiro.</p>
              </div>
            </label>

            <label className={`payment-option ${paymentMethod === 'transferencia' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="metodoPago"
                value="transferencia"
                checked={paymentMethod === 'transferencia'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ accentColor: '#ff1e2d' }}
              />
              <div>
                <strong style={{ color: '#fff', fontSize: '0.9rem', letterSpacing: '0.5px' }}>Transferencia Bancaria (CBU / Alias)</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#888' }}>Transfiriendo a la cuenta del comercio y subiendo comprobante.</p>
              </div>
            </label>

            <label className={`payment-option ${paymentMethod === 'tarjeta_naranjax' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="metodoPago"
                value="tarjeta_naranjax"
                checked={paymentMethod === 'tarjeta_naranjax'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ accentColor: '#ff1e2d' }}
              />
              <div>
                <strong style={{ color: '#fff', fontSize: '0.9rem', letterSpacing: '0.5px' }}>Tarjeta de Débito / Crédito</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#888' }}>Acepta cualquier tarjeta de cualquier banco online.</p>
              </div>
            </label>

          </div>
        </div>

        {/* Sección condicional para Transferencia */}
        {paymentMethod === 'transferencia' && (
          <div style={{ padding: '16px', backgroundColor: '#121217', border: '1px solid #ff1e2d', borderRadius: '2px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <strong style={{ color: '#fff', letterSpacing: '1px' }}>DATOS PARA TRANSFERENCIA:</strong>
            <ul style={{ margin: '0', paddingLeft: '18px', color: '#bbb', lineHeight: '1.6' }}>
              <li><strong>CBU Pesos:</strong> hkpesos</li>
              <li><strong>CBU Dólares:</strong> hkdolares</li>
            </ul>
            
            <div style={{ marginTop: '8px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: '#fff', fontSize: '0.8rem', letterSpacing: '1px' }}>
                ADJUNTAR COMPROBANTE DE PAGO (IMAGEN):
              </label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange}
                required
                style={{ fontSize: '0.8rem', color: '#ccc' }}
              />
            </div>
          </div>
        )}

        {/* Sección informativa para Tarjeta Online */}
        {paymentMethod === 'tarjeta_naranjax' && (
          <div style={{ padding: '14px', backgroundColor: '#121217', border: '1px solid #1f1f26', borderRadius: '2px', fontSize: '0.85rem' }}>
            <p style={{ margin: 0, color: '#aaa', lineHeight: '1.5' }}>Al confirmar, el pedido quedará registrado y nos pondremos en contacto para coordinar el pago con tarjeta.</p>
          </div>
        )}

        {/* Resumen del Total */}
        <div style={{ padding: '18px', backgroundColor: '#0e0e12', border: '1px solid #1f1f26', borderRadius: '2px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <p style={{ margin: '0', color: '#888', fontSize: '0.85rem' }}>
            Total en USD: <strong style={{ color: '#fff' }}>${safeTotalUSD.toFixed(2)} USD</strong>
          </p>
          {loadingRate ? (
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#ff1e2d' }}>Actualizando cotización del dólar...</p>
          ) : (
            <h3 style={{ margin: '6px 0 0 0', color: '#fff', fontSize: '1.2rem', letterSpacing: '0.5px' }}>
              Total a Pagar: <span style={{ color: '#ff1e2d' }}>${totalARS.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS</span>
            </h3>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || loadingRate}
          className="checkout-btn"
        >
          {loading ? 'PROCESANDO...' : 'CONFIRMAR PEDIDO'}
        </button>

      </form>
    </div>
  );
}