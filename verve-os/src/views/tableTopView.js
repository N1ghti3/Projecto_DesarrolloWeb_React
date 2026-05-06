// src/views/tableTopView.js
import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import MenuItem from '../components/menu/menuItem'; 
import Cart from '../components/cart/cart';
import useOrderViewModel from '../viewmodels/OrderViewModel';
import '../assets/styles/tableTopView.css';

const TabletopView = () => {
  const { tableId } = useParams();
  const {
    menuItems,
    cartItems,
    addToCart,
    setSelectedTable,
  } = useOrderViewModel();

  useEffect(() => {
    setSelectedTable(tableId);
  }, [tableId, setSelectedTable]);

  const handleAddToCart = (itemToAdd) => {
    addToCart(itemToAdd);
  };

  return (
    <div className="tabletop-container">
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h1>Mesa #{tableId}</h1>
        <Link className="btn" to="/select">Volver al inicio</Link>
      </header>
      <h2>Nuestro Menú</h2>
      <div className="menu-grid">
        {menuItems.map(item => (
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
