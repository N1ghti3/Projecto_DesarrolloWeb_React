export const createOrderItem = (menuItem, tableId = '') => ({
  id: menuItem.id,
  name: menuItem.name,
  price: menuItem.price,
  image: menuItem.image,
  category: menuItem.category,
  tableId,
});

export const createOrderSummary = (tableId, items) => ({
  tableId,
  items,
  total: items.reduce((total, item) => total + item.price, 0),
  createdAt: new Date().toISOString(),
});
