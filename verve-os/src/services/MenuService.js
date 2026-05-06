import { createMenuItem } from '../models/menuModel';

const BASE_MENU = [
  createMenuItem({
    id: 1,
    name: 'Margarita',
    category: 'Cócteles',
    price: 12.5,
    stock: 50,
    image: 'margarita.png',
    description: 'Tequila, triple sec y jugo de lima natural.',
  }),
  createMenuItem({
    id: 2,
    name: 'Papas Fritas',
    category: 'Aperitivos',
    price: 6.0,
    stock: 100,
    image: 'papas.png',
    description: 'Papas a la francesa con salsa de la casa.',
  }),
  createMenuItem({
    id: 3,
    name: 'Mojito',
    category: 'Cócteles',
    price: 11.0,
    stock: 40,
    image: 'mojito.png',
    description: 'Ron, hierbabuena, soda y limón.',
  }),
  createMenuItem({
    id: 4,
    name: 'Nachos con Queso',
    category: 'Aperitivos',
    price: 9.5,
    stock: 60,
    image: 'nachos.png',
    description: 'Totopos con queso fundido y pico de gallo.',
  }),
  createMenuItem({
    id: 5,
    name: 'Cerveza Club Colombia',
    category: 'Cervezas',
    price: 5.0,
    stock: 120,
    image: 'club-colombia.png',
    description: 'Cerveza lager bien fría.',
  }),
];

const clone = (collection) => collection.map((item) => ({ ...item }));

class MenuService {
  static getMenu() {
    return clone(BASE_MENU);
  }

  static getCommandMenu() {
    return clone(BASE_MENU).map(({ id, name, price, stock, category }) => ({
      id,
      name,
      price,
      stock,
      category,
    }));
  }
}

export default MenuService;
