// src/views/barDisplayView.js
import React, { useState, useEffect } from 'react';
import initialOrders from '../assets/initialData/initialDataBarDisplayView.js';
// Importa los estilos específicos para esta vista
import './assets/styles/barDisplayView.css';
const initialOrders = [
  { id: 101, table: 5, item: 'Margarita', status: 'recibido' },
  { id: 102, table: 2, item: 'Cerveza Club Colombia', status: 'recibido' },
];

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
      <h1>Órdenes Activas</h1>
      <div className="orders-list">
        {orders.map(order => (
          <div key={order.id} className={`order-card card status-${order.status}`}>
            <h3>Mesa: {order.table}</h3>
            <p className="order-item">{order.item}</p>
            <p className="order-status">Estado: <strong>{order.status.toUpperCase()}</strong></p>
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