// src/views/commandView.js
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ConfirmModal from '../components/modal/ConfirmModal';
import { useToast } from '../components/toast/ToastProvider';
import useOrderViewModel from '../viewmodels/OrderViewModel';

const CommandView = () => {
  const { commandItems, removeFromCommand, processCommandSelection } = useOrderViewModel();
  const { showToast } = useToast();
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [itemPendingDelete, setItemPendingDelete] = useState(null);

  useEffect(() => {
    if (!selectedItemId && commandItems.length > 0) {
      setSelectedItemId(commandItems[0].id);
    }
  }, [commandItems, selectedItemId]);

  const handleEdit = (id) => {
    showToast(`Editando item con ID: ${id}.`, 'info');
  };

  const handleProcessOrder = useCallback(() => {
    const result = processCommandSelection(selectedItemId);
    showToast(result.message, result.type);
  }, [processCommandSelection, selectedItemId, showToast]);
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && itemPendingDelete) {
        event.preventDefault();
        setItemPendingDelete(null);
        return;
      }

      if (event.key !== 'Enter' || itemPendingDelete) {
        return;
      }

      const focusedElement = document.activeElement;
      const activeTagName = focusedElement?.tagName?.toLowerCase();
      if (activeTagName === 'input' || activeTagName === 'textarea') {
        return;
      }

      event.preventDefault();
      handleProcessOrder();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [itemPendingDelete, handleProcessOrder]);

  const handleRequestDelete = (item) => {
    setItemPendingDelete(item);
  };

  const handleConfirmDelete = () => {
    if (!itemPendingDelete) {
      return;
    }

    const result = removeFromCommand(itemPendingDelete.id);
    showToast(result.message, result.type);

    if (selectedItemId === itemPendingDelete.id) {
      setSelectedItemId(null);
    }

    setItemPendingDelete(null);
  };

  return (
    <div className="command-container">
      <header className="command-header">
        <h1>Panel de Administración</h1>
        <div className="command-toolbar">
          <Link className="btn" to="/select">Volver al inicio</Link>
          <button type="button" className="btn" onClick={handleProcessOrder}>
            Procesar Pedido (Enter)
          </button>
          <button className="btn">Agregar Nuevo Producto</button>
        </div>
      </header>

      <div className="command-content">
        <h2>Gestionar Menú</h2>
        <p className="keyboard-hint">Atajo activo: presiona Enter para procesar el ítem seleccionado.</p>

        <div className="command-desktop-table">
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
              {commandItems.map(item => (
                <tr
                  key={item.id}
                  className={selectedItemId === item.id ? 'selected-row' : ''}
                  onClick={() => setSelectedItemId(item.id)}
                >
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>${item.price.toFixed(2)}</td>
                  <td>{item.stock} unidades</td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEdit(item.id);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRequestDelete(item);
                      }}
                      className="delete"
                    >
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="command-mobile-cards">
          {commandItems.map(item => (
            <article
              key={item.id}
              className={`command-card card ${selectedItemId === item.id ? 'selected' : ''}`}
              onClick={() => setSelectedItemId(item.id)}
            >
              <header className="command-card-header">
                <h3>{item.name}</h3>
                <span>ID #{item.id}</span>
              </header>
              <p><strong>Precio:</strong> ${item.price.toFixed(2)}</p>
              <p><strong>Inventario:</strong> {item.stock} unidades</p>
              <div className="command-card-actions">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleEdit(item.id);
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="delete"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRequestDelete(item);
                  }}
                >
                  Borrar
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(itemPendingDelete)}
        title="Confirmar eliminación"
        message={itemPendingDelete ? `¿Eliminar "${itemPendingDelete.name}" del menú?` : ''}
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setItemPendingDelete(null)}
      />
    </div>
  );
};

export default CommandView;
