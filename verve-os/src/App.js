// src/App.js
import React from 'react';
// Importa Link para poder crear enlaces de navegación
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';

// 👇 LA MODIFICACIÓN ESTÁ EN ESTA LÍNEA 👇
import TabletopView from './views/tableTopView'; // Apunta al archivo 'tableTopView.js'

import CommandView from './views/commandView';
import BarDisplayView from './views/barDisplayView';
import ContingencyView from './views/contingencyView';
import './assets/styles/main.css';

// Creamos un componente simple para usarlo como página de inicio
const HomePage = () => (
  <div style={{ textAlign: 'center', paddingTop: '50px', fontFamily: 'sans-serif' }}>
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

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/table/:tableId" element={<TabletopView />} />
          <Route path="/command" element={<CommandView />} />
          <Route path="/bar-display" element={<BarDisplayView />} />
          <Route path="/contingency" element={<ContingencyView />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;