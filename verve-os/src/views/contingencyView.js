// src/views/ContingencyView.js
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/toast/ToastProvider';
import useOrderViewModel from '../viewmodels/OrderViewModel';
import '../assets/styles/contingencyView.css';

const ContingencyView = () => {
  const { showToast } = useToast();
  const {
    menuItems,
    cartItems,
    selectedTable,
    setSelectedTable,
    orderFeedback,
    cartTotal,
    addToCart,
    sendContingencyOrder,
    clearOrderFeedback,
  } = useOrderViewModel();

  const handleAddToCart = (item) => {
    if (!selectedTable) {
      showToast('Por favor, selecciona una mesa antes de añadir productos.', 'warning');
      return;
    }

    addToCart(item);
    showToast(`${item.name} agregado al pedido.`, 'info', 1500);
  };

  const handleSendOrder = () => {
    const result = sendContingencyOrder();
    showToast(result.message, result.type);
  };

  useEffect(() => {
    if (!orderFeedback) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      clearOrderFeedback();
    }, 3000);

    return () => window.clearTimeout(timerId);
  }, [orderFeedback, clearOrderFeedback]);
  return (
    <div className="contingency-container">
      <header className="contingency-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h1>VerveOS - Modo de Contingencia</h1>
          <p>Toma de pedidos manual vía web.</p>
        </div>
        <Link className="btn" to="/select">Volver al inicio</Link>
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
          {menuItems.map(item => (
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
          {cartItems.length > 0 ? (
            <ul>
              {cartItems.map((item, index) => (
                <li key={index}>{item.name} - ${item.price.toFixed(2)}</li>
              ))}
            </ul>
          ) : (
            <p>El carrito está vacío.</p>
          )}
          <div className="order-total">
            <strong>Total: ${cartTotal.toFixed(2)}</strong>
          </div>
          <button 
            className="send-order-btn" 
            onClick={handleSendOrder} 
            disabled={!selectedTable || cartItems.length === 0}
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
