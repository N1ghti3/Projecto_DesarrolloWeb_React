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
        <ul>
          {items.map((item, index) => (
            <li key={index}>
              {item.name} - ${item.price.toFixed(2)}
            </li>
          ))}
        </ul>
      )}
      <h4>Total: ${total.toFixed(2)}</h4>
    </div>
  );
};

export default Cart;