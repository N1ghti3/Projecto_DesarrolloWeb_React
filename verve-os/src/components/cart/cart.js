// src/components/cart/Cart.js
import React from 'react';

// import './Cart.css';

const Cart = ({ items }) => {
  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="cart-summary">
      <h3>Mi Pedido</h3>
      {items.length === 0 ? (
        <p>Tu carrito está vacío.</p>
      ) : (
        <ul className="cart-items-list">
          {items.map((item, index) => (
            <li key={index} className="cart-item">
              <img 
                src={`/images/${item.image}`} 
                alt={item.name}
                className="cart-item-image"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0xMiAxNkgyOFYyNEgxMlYxNloiIGZpbGw9IiM2QjcyODAiLz4KPGNpcmNsZSBjeD0iMTUiIGN5PSIxOSIgcj0iMSIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMTggMTlMMjEgMjJMMjUgMThMMjggMjFWMjRIMTJWMjFMMTUgMThMMTggMTlaIiBmaWxsPSIjNkI3MjgwIi8+Cjwvc3ZnPg==';
                }}
              />
              <div className="cart-item-details">
                <span className="cart-item-name">{item.name}</span>
                <span className="cart-item-price">${item.price.toFixed(2)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <h4>Total: ${total.toFixed(2)}</h4>
    </div>
  );
};

export default Cart;