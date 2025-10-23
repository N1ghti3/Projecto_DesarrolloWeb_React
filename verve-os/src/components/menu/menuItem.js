// src/components/menu/MenuItem.js
import React from 'react';

// Asegúrate de tener los estilos en main.css o un archivo dedicado
// import './MenuItem.css';

const MenuItem = ({ item, onAddToCart }) => {
  // Desestructuramos las propiedades del item para usarlas fácilmente
  const { name, price, description, image } = item;

  return (
    <div className="card menu-item-card">
      <img 
        src={`/images/${image}`} 
        alt={name} 
        className="menu-item-image"
        onError={(e) => {
          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik02MCA4MEgxNDBWMTIwSDYwVjgwWiIgZmlsbD0iIzZCNzI4MCIvPgo8Y2lyY2xlIGN4PSI3NSIgY3k9Ijk1IiByPSI1IiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik05MCA5NUwxMDUgMTEwTDEyNSA5MEwxNDAgMTA1VjEyMEg2MFYxMDVMNzUgOTBMOTAgOTVaIiBmaWxsPSIjNkI3MjgwIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTUwIiBmaWxsPSIjOUNBM0FGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0Ij5JbWFnZW4gbm8gZGlzcG9uaWJsZTwvdGV4dD4KPHN2Zz4=';
        }}
      />
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