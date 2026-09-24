import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';

export default function PedidosAdmin() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Escuchar los pedidos en tiempo real excluyendo los cancelados
  useEffect(() => {
    const pedidosRef = collection(db, 'pedidos');

    const unsubscribe = onSnapshot(
      pedidosRef,
      (snapshot) => {
        const docs = snapshot.docs
          .map((documento) => ({
            id: documento.id,
            ...documento.data(),
          }))
          .filter((pedido) => pedido.estado !== 'Cancelado'); // Filtro de pedidos cancelados

        setPedidos(docs);
        setLoading(false);
      },
      (error) => {
        console.error("Error al obtener pedidos:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Función para actualizar el estado del pedido en Firestore
  const handleStatusChange = async (pedidoId, nuevoEstado) => {
    try {
      const pedidoRef = doc(db, 'pedidos', pedidoId);
      await updateDoc(pedidoRef, {
        estado: nuevoEstado,
      });
      console.log(`Estado del pedido ${pedidoId} actualizado a: ${nuevoEstado}`);
    } catch (error) {
      console.error("Error al actualizar el estado del pedido:", error);
      alert("No se pudo actualizar el estado del pedido.");
    }
  };

  if (loading) {
    return <p style={{ color: '#94a3b8' }}>Cargando pedidos...</p>;
  }

  return (
    <div style={{ background: '#0f172a', padding: '20px', borderRadius: '8px', color: '#f8fafc' }}>
      <h3 style={{ marginTop: 0, color: '#f8fafc' }}>Gestión de Pedidos ({pedidos.length})</h3>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px', color: '#f8fafc' }}>
        <thead>
          <tr style={{ background: '#1e293b', textAlign: 'left', borderBottom: '2px solid #334155' }}>
            <th style={{ padding: '10px 8px' }}>ID Pedido</th>
            <th style={{ padding: '10px 8px' }}>Cliente</th>
            <th style={{ padding: '10px 8px' }}>Envío & Teléfono</th>
            <th style={{ padding: '10px 8px' }}>Pago / Comprobante</th>
            <th style={{ padding: '10px 8px' }}>Artículos</th>
            <th style={{ padding: '10px 8px' }}>Total</th>
            <th style={{ padding: '10px 8px' }}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ padding: '15px', textAlign: 'center', color: '#94a3b8' }}>
                No hay pedidos registrados o activos.
              </td>
            </tr>
          ) : (
            pedidos.map((pedido) => (
              <tr key={pedido.id} style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '10px 8px', fontFamily: 'monospace' }}>
                  <span style={{ background: '#1e293b', border: '1px solid #475569', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                    {pedido.id}
                  </span>
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <strong>{pedido.cliente?.nombre || pedido.clienteNombre || 'Cliente'}</strong>
                  <br />
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {pedido.cliente?.email || pedido.userEmail || 'Sin email'}
                  </span>
                </td>
                <td style={{ padding: '10px 8px', fontSize: '13px' }}>
                  {pedido.envio?.direccion || pedido.cliente?.direccion || pedido.direccionEnvio || 'Retiro en local'}
                  <br />
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Tel: {pedido.envio?.telefono || pedido.cliente?.telefono || pedido.clienteTelefono || 'Sin teléfono'}
                  </span>
                </td>
                
                {/* Nueva Columna: Método de Pago y Comprobante Cloudinary */}
                <td style={{ padding: '10px 8px', fontSize: '13px' }}>
                  <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
                    {pedido.metodoPago || 'Transferencia'}
                  </span>
                  {pedido.comprobanteUrl ? (
                    <div style={{ marginTop: '4px' }}>
                      <a
                        href={pedido.comprobanteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#38bdf8', textDecoration: 'underline', fontSize: '12px' }}
                      >
                        Ver Comprobante 🔗
                      </a>
                    </div>
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: '11px' }}>Sin comprobante</div>
                  )}
                </td>

                <td style={{ padding: '10px 8px', fontSize: '13px' }}>
                  {Array.isArray(pedido.items) ? (
                    pedido.items.map((item, idx) => (
                      <div key={idx}>
                        ▪ {item.cantidad || item.quantity || 1}x {item.nombre} {item.talle || item.talleElegido ? `(Talle: ${item.talle || item.talleElegido})` : ''}
                      </div>
                    ))
                  ) : (
                    <span>Sin información de artículos</span>
                  )}
                </td>
                <td style={{ padding: '10px 8px', fontWeight: 'bold' }}>
                  ${pedido.total || 0}
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <select
                    value={pedido.estado || 'Pendiente'}
                    onChange={(e) => handleStatusChange(pedido.id, e.target.value)}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#f8fafc',
                      border: '1px solid #475569',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En preparación">En preparación</option>
                    <option value="Enviado">Enviado</option>
                    <option value="Entregado">Entregado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}