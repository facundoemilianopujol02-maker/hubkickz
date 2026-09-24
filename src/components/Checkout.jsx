import React, { useState } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function Checkout({ cart, totalAmount, clearCart, onOrderSuccess }) {
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [customerInfo, setCustomerInfo] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    setCustomerInfo({
      ...customerInfo,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      setError('El carrito está vacío.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const newOrder = {
        cliente: customerInfo,
        items: cart,
        total: Number(totalAmount),
        metodoPago: paymentMethod, // 'efectivo' | 'transferencia' | 'tarjeta_debito'
        estado: paymentMethod === 'transferencia' ? 'Pendiente de Confirmación' : 'Aprobado',
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'pedidos'), newOrder);
      
      if (clearCart) clearCart();
      if (onOrderSuccess) onOrderSuccess(docRef.id, newOrder);

    } catch (err) {
      console.error('Error al guardar el pedido:', err);
      setError('Ocurrió un error al procesar el pedido. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Finalizar Compra</h2>

      {error && (
        <div style={{ padding: '10px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', marginBottom: '15px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmitOrder} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* Datos del Cliente */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3>1. Datos del Cliente</h3>
          <input
            type="text"
            name="nombre"
            placeholder="Nombre Completo"
            value={customerInfo.nombre}
            onChange={handleInputChange}
            required
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input
            type="email"
            name="email"
            placeholder="Correo Electrónico"
            value={customerInfo.email}
            onChange={handleInputChange}
            required
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input
            type="tel"
            name="telefono"
            placeholder="Teléfono"
            value={customerInfo.telefono}
            onChange={handleInputChange}
            required
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input
            type="text"
            name="direccion"
            placeholder="Dirección de Envío"
            value={customerInfo.direccion}
            onChange={handleInputChange}
            required
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        {/* Métodos de Pago */}
        <div style={{ marginTop: '10px' }}>
          <h3>2. Método de Pago</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* Opción 1: Efectivo */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="metodoPago"
                value="efectivo"
                checked={paymentMethod === 'efectivo'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <div>
                <strong>Efectivo</strong>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Pago al momento de la entrega o retiro en local.</p>
              </div>
            </label>

            {/* Opción 2: Transferencia */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="metodoPago"
                value="transferencia"
                checked={paymentMethod === 'transferencia'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <div>
                <strong>Transferencia Bancaria</strong>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Abona por CBU/Alias y envía el comprobante.</p>
              </div>
            </label>

            {/* Opción 3: Tarjeta Débito */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="metodoPago"
                value="tarjeta_debito"
                checked={paymentMethod === 'tarjeta_debito'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <div>
                <strong>Tarjeta de Débito</strong>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Pago online instantáneo mediante posnet o pasarela.</p>
              </div>
            </label>

          </div>
        </div>

        {/* Instrucciones dinámicas según selección */}
        {paymentMethod === 'transferencia' && (
          <div style={{ padding: '12px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', fontSize: '14px' }}>
            <strong>Datos para Transferencia:</strong>
            <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>
              <li><strong>Alias:</strong> HUBKICKZ.PAY</li>
              <li><strong>CBU:</strong> 0000003100012345678901</li>
              <li><strong>Banco:</strong> Banco Galicia</li>
            </ul>
          </div>
        )}

        {/* Resumen del Total */}
        <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
          <h4>Total a Pagar: ${Number(totalAmount).toLocaleString('es-AR')}</h4>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px',
            backgroundColor: loading ? '#94a3b8' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Procesando Pedido...' : 'Confirmar Pedido'}
        </button>

      </form>
    </div>
  );
}