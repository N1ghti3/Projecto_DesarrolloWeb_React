// src/views/barDisplayView.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import initialOrders from '../assets/initialData/initialDataBarDisplayView.js';
// Importa los estilos específicos para esta vista
import '../assets/styles/barDisplayView.css';

const BarDisplayView = () => {
  const [orders, setOrders] = useState(initialOrders);

  // Función para cambiar el estado de una orden
  const handleUpdateStatus = (orderId, newStatus) => {
    setOrders(currentOrders =>
      currentOrders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

  return (
    <div className="bar-display-container">
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
        <h1>Órdenes Activas</h1>
        <Link className="btn" to="/select">Volver al inicio</Link>
      </header>
      <div className="orders-list">
        {orders.map(order => (
          <div key={order.id} className={`order-card card status-${String(order.status).replace(' ', '-')}`}>
            <h3>Mesa: {order.table}</h3>
            <p className="order-item">{order.item}</p>
            <p className="order-status">Estado: <strong>{String(order.status).toUpperCase()}</strong></p>
            <div className="order-actions">
              <button onClick={() => handleUpdateStatus(order.id, 'en preparación')}>En Preparación</button>
              <button onClick={() => handleUpdateStatus(order.id, 'listo')}>Listo</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BarDisplayView;
