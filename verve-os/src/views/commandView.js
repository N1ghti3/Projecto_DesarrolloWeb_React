// src/views/commandView.js
import React, { useState } from 'react';

const initialMenu = [
  { id: 1, name: 'Margarita', price: 12.50, stock: 50 },
  { id: 2, name: 'Papas Fritas', price: 6.00, stock: 100 },
];

const CommandView = () => {
  const [menuItems, setMenuItems] = useState(initialMenu);

  const handleEdit = (id) => {
    alert(`Editando item con ID: ${id}. Aquí abrirías un modal con un formulario.`);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este item?')) {
      setMenuItems(currentItems => currentItems.filter(item => item.id !== id));
    }
  };

  return (
    <div className="command-container">
      <header className="command-header">
        <h1>Panel de Administración</h1>
        <button className="btn">Agregar Nuevo Producto</button>
      </header>

      <div className="command-content">
        <h2>Gestionar Menú</h2>
        <table className="menu-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Precio</th>
              <th>Inventario</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {menuItems.map(item => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.name}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>{item.stock} unidades</td>
                <td className="actions-cell">
                  <button onClick={() => handleEdit(item.id)}>Editar</button>
                  <button onClick={() => handleDelete(item.id)} className="delete">Borrar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CommandView;