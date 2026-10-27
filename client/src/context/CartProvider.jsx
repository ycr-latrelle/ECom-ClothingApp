import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { CartContext } from './cart-context.js';

const STORAGE_KEY = 'thread-theory-cart';

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function reducer(items, action) {
  switch (action.type) {
    case 'add': {
      const exists = items.find((i) => i.id === action.item.id);
      if (exists) {
        return items.map((i) => (i.id === exists.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...items, { ...action.item, qty: 1 }];
    }
    case 'increase':
      return items.map((i) => (i.id === action.id ? { ...i, qty: i.qty + 1 } : i));
    case 'decrease':
      return items
        .map((i) => (i.id === action.id ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0);
    case 'remove':
      return items.filter((i) => i.id !== action.id);
    case 'clear':
      return [];
    default:
      return items;
  }
}

export default function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, undefined, load);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable - cart just won't persist */
    }
  }, [items]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({
      items,
      isOpen,
      openCart,
      closeCart,
      count: items.reduce((sum, i) => sum + i.qty, 0),
      subtotal: items.reduce((sum, i) => sum + i.qty * i.price, 0),
      addItem: (item) => dispatch({ type: 'add', item }),
      increase: (id) => dispatch({ type: 'increase', id }),
      decrease: (id) => dispatch({ type: 'decrease', id }),
      removeItem: (id) => dispatch({ type: 'remove', id }),
      clearCart: () => dispatch({ type: 'clear' }),
    }),
    [items, isOpen, openCart, closeCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
