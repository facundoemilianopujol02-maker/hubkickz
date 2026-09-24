import React, { useEffect, useState } from 'react';
import { db } from './firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, Calendar } from 'lucide-react';

export default function SalesDashboard() {
  const [allOrders, setAllOrders] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [metrics, setMetrics] = useState({ totalRevenue: 0, totalOrders: 0, avgTicket: 0 });
  const [rangeDays, setRangeDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const ordersRef = collection(db, 'pedidos');
        const querySnapshot = await getDocs(ordersRef);

        const loadedOrders = [];

        querySnapshot.forEach((doc) => {
          const order = doc.data();

          if (order.estado === 'Cancelado') {
            return;
          }

          const orderTotal = Number(order.total) || 0;

          let dateObj = new Date();
          if (order.createdAt?.toDate && typeof order.createdAt.toDate === 'function') {
            dateObj = order.createdAt.toDate();
          } else if (order.createdAt?.seconds) {
            dateObj = new Date(order.createdAt.seconds * 1000);
          } else if (order.createdAt) {
            dateObj = new Date(order.createdAt);
          } else if (order.fecha) {
            dateObj = new Date(order.fecha);
          }

          loadedOrders.push({
            id: doc.id,
            total: orderTotal,
            dateObj: dateObj
          });
        });

        setAllOrders(loadedOrders);
      } catch (error) {
        console.error('Error general al obtener ventas:', error);
        setErrorMsg(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, []);

  useEffect(() => {
    if (allOrders.length === 0) {
      setSalesData([]);
      setMetrics({ totalRevenue: 0, totalOrders: 0, avgTicket: 0 });
      return;
    }

    const ahora = new Date();
    const fechaLimite = new Date();
    fechaLimite.setDate(ahora.getDate() - rangeDays);

    const filteredOrders = allOrders.filter((order) => order.dateObj >= fechaLimite);

    filteredOrders.sort((a, b) => a.dateObj - b.dateObj);

    let total = 0;
    let count = 0;
    const groupedByDate = {};

    filteredOrders.forEach((order) => {
      const dateKey = rangeDays > 60
        ? order.dateObj.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
        : order.dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });

      total += order.total;
      count += 1;

      if (groupedByDate[dateKey]) {
        groupedByDate[dateKey] += order.total;
      } else {
        groupedByDate[dateKey] = order.total;
      }
    });

    const formattedChartData = Object.keys(groupedByDate).map((date) => ({
      fecha: date,
      ventas: groupedByDate[date],
    }));

    setSalesData(formattedChartData);
    setMetrics({
      totalRevenue: total,
      totalOrders: count,
      avgTicket: count > 0 ? (total / count).toFixed(0) : 0,
    });
  }, [rangeDays, allOrders]);

  if (loading) {
    return (
      <div style={{ padding: '20px', color: '#64748b' }}>
        <p>Cargando estadísticas de las ventas...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ padding: '20px', color: '#dc2626' }}>
        <h3>Error al obtener los datos</h3>
        <p>{errorMsg}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ color: '#1e293b', margin: 0 }}>Métricas y Estadísticas de Ventas</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '8px' }}>
          <Calendar size={18} color="#64748b" />
          <label htmlFor="rangeSelect" style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Período:</label>
          <select
            id="rangeSelect"
            value={rangeDays}
            onChange={(e) => setRangeDays(Number(e.target.value))}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '14px',
              color: '#0f172a',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value={3}>Últimos 3 días</option>
            <option value={7}>Últimos 7 días</option>
            <option value={15}>Últimos 15 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={180}>Últimos 6 meses</option>
            <option value={365}>Últimos 12 meses</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '10px', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a' }}>
            <DollarSign size={20} />
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Ingresos Totales</span>
          </div>
          <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#0f172a' }}>
            ${metrics.totalRevenue.toLocaleString('es-AR')}
          </p>
        </div>

        <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '10px', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb' }}>
            <ShoppingBag size={20} />
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Total Pedidos Activos</span>
          </div>
          <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#0f172a' }}>
            {metrics.totalOrders}
          </p>
        </div>

        <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '10px', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9333ea' }}>
            <TrendingUp size={20} />
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Ticket Promedio</span>
          </div>
          <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#0f172a' }}>
            ${Number(metrics.avgTicket).toLocaleString('es-AR')}
          </p>
        </div>
      </div>

      <div style={{ border: '1px solid #e2e8f0', padding: '20px', borderRadius: '10px', backgroundColor: '#ffffff' }}>
        <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#334155' }}>Evolución de Ingresos</h3>
        
        {salesData.length > 0 ? (
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="fecha" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString('es-AR')}`, 'Ventas']} />
                <Line type="monotone" dataKey="ventas" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            <p style={{ margin: 0 }}>No hay pedidos registrados en el período seleccionado.</p>
          </div>
        )}
      </div>
    </div>
  );
}