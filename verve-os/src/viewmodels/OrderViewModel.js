import { useCallback, useMemo, useState } from 'react';
import { createOrderItem, createOrderSummary } from '../models/orderModel';
import MenuService from '../services/MenuService';

const useOrderViewModel = () => {
  const [menuItems] = useState(() => MenuService.getMenu());
  const [commandItems, setCommandItems] = useState(() => MenuService.getCommandMenu());
  const [cartItems, setCartItems] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [orderFeedback, setOrderFeedback] = useState('');

  const addToCart = useCallback((menuItem) => {
    setCartItems((currentItems) => [...currentItems, createOrderItem(menuItem, selectedTable)]);
  }, [selectedTable]);

  const removeFromCommand = useCallback((itemId) => {
    const itemToRemove = commandItems.find((item) => item.id === itemId);

    if (!itemToRemove) {
      return {
        success: false,
        type: 'error',
        message: 'No se encontró el ítem que intentas eliminar.',
      };
    }

    setCommandItems((currentItems) => currentItems.filter((item) => item.id !== itemId));

    return {
      success: true,
      type: 'success',
      message: `${itemToRemove.name} eliminado del menú.`,
    };
  }, [commandItems]);

  const processCommandSelection = useCallback((itemId) => {
    if (!itemId) {
      return {
        success: false,
        type: 'warning',
        message: 'Selecciona un ítem antes de procesar el pedido.',
      };
    }

    const selectedItem = commandItems.find((item) => item.id === itemId);

    if (!selectedItem) {
      return {
        success: false,
        type: 'error',
        message: 'El ítem seleccionado ya no existe en el menú.',
      };
    }

    return {
      success: true,
      type: 'success',
      message: `Pedido de ${selectedItem.name} procesado correctamente.`,
    };
  }, [commandItems]);

  const sendContingencyOrder = useCallback(() => {
    if (!selectedTable || cartItems.length === 0) {
      return {
        success: false,
        type: 'error',
        message: 'Debes seleccionar una mesa y añadir productos al pedido.',
      };
    }

    const orderSummary = createOrderSummary(selectedTable, cartItems);
    setOrderFeedback(`¡Pedido para la mesa ${selectedTable} enviado con éxito!`);
    setCartItems([]);
    setSelectedTable('');

    return {
      success: true,
      type: 'success',
      message: `Pedido de ${orderSummary.items.length} productos enviado para la mesa ${orderSummary.tableId}.`,
      order: orderSummary,
    };
  }, [selectedTable, cartItems]);

  const clearOrderFeedback = useCallback(() => {
    setOrderFeedback('');
  }, []);

  const cartTotal = useMemo(
    () => cartItems.reduce((total, item) => total + item.price, 0),
    [cartItems]
  );

  return {
    menuItems,
    commandItems,
    cartItems,
    selectedTable,
    orderFeedback,
    cartTotal,
    setSelectedTable,
    addToCart,
    removeFromCommand,
    processCommandSelection,
    sendContingencyOrder,
    clearOrderFeedback,
  };
};

export default useOrderViewModel;
