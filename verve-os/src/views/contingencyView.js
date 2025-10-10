// src/views/ContingencyView.js
import React, { useState, useEffect } from 'react';

// Datos de ejemplo que, en un caso real, vendrían de una API
const menuData = [
  { id: 1, name: 'Margarita', category: 'Cócteles', price: 12.50 },
  { id: 2, name: 'Papas Fritas', category: 'Aperitivos', price: 6.00 },
  { id: 3, name: 'Cerveza Club Colombia', category: 'Cervezas', price: 5.00 },
  { id: 4, name: 'Nachos con Queso', category: 'Aperitivos', price: 9.50 },
  { id: 5, name: 'Mojito', category: 'Cócteles', price: 11.00 },
];

const ContingencyView = () => {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [orderFeedback, setOrderFeedback] = useState('');

  useEffect(() => {
    // Simula la carga del menú desde una API
    setMenu(menuData);
  }, []);

  const handleAddToCart = (item) => {
    if (!selectedTable) {
      alert('Por favor, selecciona una mesa antes de añadir productos.');
      return;
    }
    setCart(prevCart => [...prevCart, item]);
  };

  const handleSendOrder = () => {
    if (!selectedTable || cart.length === 0) {
      setOrderFeedback('Error: Debes seleccionar una mesa y añadir productos al pedido.');
      return;
    }
    
    // Aquí se enviaría el pedido a la API del backend
    console.log(`--- NUEVO PEDIDO (CONTINGENCIA) ---`);
    console.log(`Mesa: ${selectedTable}`);
    console.log('Items:', cart);
    console.log('Total:', cart.reduce((total, item) => total + item.price, 0).toFixed(2));
    console.log(`---------------------------------`);

    // Mostrar confirmación y limpiar el estado
    setOrderFeedback(`¡Pedido para la mesa ${selectedTable} enviado con éxito!`);
    setCart([]);
    setSelectedTable('');

    // Limpiar el mensaje después de unos segundos
    setTimeout(() => setOrderFeedback(''), 3000);
  };

  return (
    <div className="contingency-container">
      <header className="contingency-header">
        <h1>VerveOS - Modo de Contingencia</h1>
        <p>Toma de pedidos manual vía web.</p>
      </header>

      <div className="table-selection">
        <label htmlFor="table-number">Número de Mesa:</label>
        <input
          type="number"
          id="table-number"
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
          placeholder="Ej: 5"
        />
      </div>

      <div className="contingency-content">
        <div className="menu-list">
          <h2>Menú Disponible</h2>
          {menu.map(item => (
            <div key={item.id} className="menu-item-contingency">
              <span>{item.name} - ${item.price.toFixed(2)}</span>
              <button onClick={() => handleAddToCart(item)} disabled={!selectedTable}>
                +
              </button>
            </div>
          ))}
        </div>

        <div className="order-summary">
          <h2>Pedido Actual</h2>
          {cart.length > 0 ? (
            <ul>
              {cart.map((item, index) => (
                <li key={index}>{item.name} - ${item.price.toFixed(2)}</li>
              ))}
            </ul>
          ) : (
            <p>El carrito está vacío.</p>
          )}
          <div className="order-total">
            <strong>Total: ${cart.reduce((total, item) => total + item.price, 0).toFixed(2)}</strong>
          </div>
          <button 
            className="send-order-btn" 
            onClick={handleSendOrder} 
            disabled={!selectedTable || cart.length === 0}
          >
            Enviar Pedido
          </button>
          {orderFeedback && <p className="feedback-message">{orderFeedback}</p>}
        </div>
      </div>
    </div>
  );
};

export default ContingencyView;