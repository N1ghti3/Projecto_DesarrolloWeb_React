// src/views/tableTopView.js
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import MenuItem from '../components/menu/menuItem'; 
import Cart from '../components/cart/cart';
import '../assets/styles/tableTopView.css';

// Datos de ejemplo (eventualmente vendrán de una API)
const menuData = [
  { id: 1, name: 'Margarita', price: 12.50, image: 'margarita.jpg', description: 'Tequila, triple sec y jugo de lima natural.' },
  { id: 2, name: 'Papas Fritas', price: 6.00, image: 'papas.jpg', description: 'Papas a la francesa con salsa de la casa.' },
  { id: 3, name: 'Mojito', price: 11.00, image: 'mojito.jpg', description: 'Ron, hierbabuena, soda y limón.' },
  { id: 4, name: 'Nachos con Queso', price: 9.50, image: 'nachos.jpg', description: 'Totopos con queso fundido y pico de gallo.' },
  { id: 5, name: 'Cerveza Club Colombia', price: 5.00, image: 'club-colombia.jpg', description: 'Cerveza lager bien fría.' },
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
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h1>Mesa #{tableId}</h1>
        <Link className="btn" to="/select">Volver al inicio</Link>
      </header>
      <h2>Nuestro Menú</h2>
      <div className="menu-grid">
        {menuData.map(item => (
          <MenuItem
            key={item.id}
            item={item}
            onAddToCart={handleAddToCart}
          />
        ))}
      </div>
      <Cart items={cartItems} />
    </div>
  );
};

export default TabletopView;
