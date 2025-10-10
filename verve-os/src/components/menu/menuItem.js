// src/components/menu/MenuItem.js
import React from 'react';

// Asegúrate de tener los estilos en main.css o un archivo dedicado
// import './MenuItem.css';

const MenuItem = ({ item, onAddToCart }) => {
  // Desestructuramos las propiedades del item para usarlas fácilmente
  const { name, price, description, image } = item;

  return (
    <div className="card menu-item-card">
      <img src={`/images/${image}`} alt={name} className="menu-item-image" />
      <div className="menu-item-details">
        <h3>{name}</h3>
        <p>{description}</p>
        <div className="price">${price.toFixed(2)}</div>
        <button className="btn btn-primary" onClick={() => onAddToCart(item)}>
          Agregar
        </button>
      </div>
    </div>
  );
};

export default MenuItem;