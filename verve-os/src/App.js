// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import TabletopView from './views/tableTopView';
import CommandView from './views/commandView';
import BarDisplayView from './views/barDisplayView';
import ContingencyView from './views/contingencyView';
import LoginView from './views/loginView';
import SelectView from './views/selectView';
import './assets/styles/main.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LoginView />} />
          <Route path="/select" element={<SelectView />} />
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
