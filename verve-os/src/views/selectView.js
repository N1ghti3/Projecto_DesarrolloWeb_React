// src/views/selectView.js
import React from 'react';
import { Link } from 'react-router-dom';

const SelectView = () => {
  return (
    <div style={{ textAlign: 'center', paddingTop: '50px' }}>
      <h1>Bienvenido a VerveOS</h1>
      <p style={{ marginBottom: '30px' }}>Selecciona una vista para continuar:</p>
      <nav style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
        <Link to="/table/1" style={{ textDecoration: 'none', color: '#6d28d9', fontWeight: 'bold' }}>
          ➡️ Vista de Mesa (Ej: Mesa 1)
        </Link>
        <Link to="/command" style={{ textDecoration: 'none', color: '#6d28d9', fontWeight: 'bold' }}>
          ➡️ Panel de Administración (Command)
        </Link>
        <Link to="/bar-display" style={{ textDecoration: 'none', color: '#6d28d9', fontWeight: 'bold' }}>
          ➡️ Vista de Barra
        </Link>
        <Link to="/contingency" style={{ textDecoration: 'none', color: '#6d28d9', fontWeight: 'bold' }}>
          ➡️ Modo de Contingencia Web
        </Link>
      </nav>
    </div>
  );
};

export default SelectView;