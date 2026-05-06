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