import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Componente SalesDashboard
 * Muestra el panel con métricas clave de ventas, pedidos e ingresos.
 * Se conecta a la colección 'pedidos' de Firestore para calcular los totales automáticamente.
 *
 * @param {Object} props
 * @param {Array} [props.orders] - Lista opcional de pedidos si se pasa desde el componente padre.
 */
export default function SalesDashboard({ orders: initialOrders }) {
  const [pedidos, setPedidos] = useState(initialOrders || []);
  const [loading, setLoading] = useState(!initialOrders);

  // Escuchar pedidos en tiempo real si no se recibieron por props
  useEffect(() => {
    if (initialOrders) return;

    const pedidosRef = collection(db, 'pedidos');
    const unsubscribe = onSnapshot(
      pedidosRef,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPedidos(docs);
        setLoading(false);
      },
      (error) => {
        console.error('Error al obtener pedidos para el dashboard:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [initialOrders]);

  // Cálculos de métricas a partir de los pedidos activos (excluyendo cancelados)
  const pedidosValidos = pedidos.filter((p) => p.estado !== 'Cancelado');

  const totalIngresos = pedidosValidos.reduce(
    (acc, p) => acc + (Number(p.total) || 0),
    0
  );

  const totalPedidos = pedidosValidos.length;

  const ticketPromedio =
    totalPedidos > 0 ? (totalIngresos / totalPedidos).toFixed(2) : 0;

  const pedidosPendientes = pedidosValidos.filter(
    (p) => p.estado === 'Pendiente' || p.estado === 'Pendiente de Confirmación'
  ).length;

  if (loading) {
    return (
      <div style={{ padding: '20px', color: '#64748b' }}>
        Cargando métricas de ventas...
      </div>
    );
  }

  return (
    <div className="sales-dashboard-container" style={styles.container}>
      <h3 style={styles.title}>Métricas Generales de Ventas</h3>

      <div style={styles.grid}>
        <div style={{ ...styles.card, borderLeft: '4px solid #10b981' }}>
          <span style={styles.cardTitle}>Ingresos Totales</span>
          <p style={styles.cardValue}>${totalIngresos.toLocaleString('es-AR')}</p>
        </div>

        <div style={{ ...styles.card, borderLeft: '4px solid #3b82f6' }}>
          <span style={styles.cardTitle}>Órdenes Registradas</span>
          <p style={styles.cardValue}>{totalPedidos}</p>
        </div>

        <div style={{ ...styles.card, borderLeft: '4px solid #8b5cf6' }}>
          <span style={styles.cardTitle}>Ticket Promedio</span>
          <p style={styles.cardValue}>${Number(ticketPromedio).toLocaleString('es-AR')}</p>
        </div>

        <div style={{ ...styles.card, borderLeft: '4px solid #f59e0b' }}>
          <span style={styles.cardTitle}>Pedidos por Procesar</span>
          <p style={styles.cardValue}>{pedidosPendientes}</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    color: '#f8fafc',
  },
  title: {
    marginTop: 0,
    marginBottom: '20px',
    color: '#f8fafc',
    fontSize: '1.2rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: '#1e293b',
    padding: '16px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  cardTitle: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    fontWeight: '500',
  },
  cardValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: 0,
    color: '#f8fafc',
  },
};