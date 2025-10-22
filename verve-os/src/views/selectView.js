// src/views/selectView.js
import React from 'react';
import { Link } from 'react-router-dom';

const SelectView = () => {
  return (
    <div className="select-view-container">
      <div className="select-view-content">
        <h1>Bienvenido a VerveOS</h1>
        <p className="select-subtitle">Selecciona una vista para continuar:</p>
        <nav className="select-nav">
          <Link to="/table/1" className="select-link card">
            <span className="select-icon">🍽️</span>
            <span className="select-text">Vista de Mesa (Ej: Mesa 1)</span>
          </Link>
          <Link to="/command" className="select-link card">
            <span className="select-icon">⚙️</span>
            <span className="select-text">Panel de Administración</span>
          </Link>
          <Link to="/bar-display" className="select-link card">
            <span className="select-icon">🍸</span>
            <span className="select-text">Vista de Barra</span>
          </Link>
          <Link to="/contingency" className="select-link card">
            <span className="select-icon">🆘</span>
            <span className="select-text">Modo de Contingencia Web</span>
          </Link>
        </nav>
      </div>
    </div>
  );
};

export default SelectView;