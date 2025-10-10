// src/views/tableTopView.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MenuItem from '../components/menu/menuItem'; 
import Cart from '../components/cart/cart';

// Datos de ejemplo (eventualmente vendrán de una API)
const menuData = [
  { id: 1, name: 'Margarita', price: 12.50, image: 'margarita.jpg', description: 'Tequila, triple sec, y jugo de lima.' },
  { id: 2, name: 'Papas Fritas', price: 6.00, image: 'papas.jpg', description: 'Papas a la francesa con salsa de la casa.' },
];

const TabletopView = () => {
  const { tableId } = useParams();
  const [cartItems, setCartItems] = useState([]); // Estado para el carrito

  // Función para agregar un item al carrito
  const handleAddToCart = (itemToAdd) => {
    setCartItems([...cartItems, itemToAdd]);
  };

  return (
    <div className="tabletop-container">
      <h1>Mesa #{tableId}</h1>
      <h2>Nuestro Menú</h2>
      <div className="menu-grid">
        {menuData.map(item => (
          <MenuItem
            key={item.id}
            item={item}
            onAddToCart={handleAddToCart} // Pasamos la función al componente hijo
          />
        ))}
      </div>
      <Cart items={cartItems} /> {/* Pasamos los items del carrito */}
    </div>
  );
};

export default TabletopView;