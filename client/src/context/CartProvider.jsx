import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { CartContext, MAX_QTY } from './cart-context.js';
import { aboutContent } from '../data/aboutContent.js';

const STORAGE_KEY = 'thread-theory-cart';

// One cart line per product + size, so M and L of the same hoodie stay separate.
const makeKey = (id, size) => (size ? `${id}::${size}` : id);
const clamp = (qty) => Math.min(MAX_QTY, qty);

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved)) return [];
    // carries older saved carts (no key / size) forward safely
    return saved.map((i) => ({
      ...i,
      key: i.key ?? makeKey(i.id, i.size),
      qty: clamp(i.qty),
      selected: i.selected ?? true,
    }));
  } catch {
    return [];
  }
}

function reducer(items, action) {
  switch (action.type) {
    case 'add': {
      const exists = items.find((i) => i.key === action.item.key);
      if (exists) {
        // adding again also re-selects the line for checkout
        return items.map((i) => (i.key === exists.key ? { ...i, qty: clamp(i.qty + action.qty), selected: true } : i));
      }
      return [...items, { ...action.item, qty: clamp(action.qty), selected: true }];
    }
    case 'increase':
      return items.map((i) => (i.key === action.key ? { ...i, qty: clamp(i.qty + 1) } : i));
    case 'decrease':
      return items
        .map((i) => (i.key === action.key ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0);
    case 'toggle':
      return items.map((i) => (i.key === action.key ? { ...i, selected: !i.selected } : i));
    case 'select-all':
      return items.map((i) => ({ ...i, selected: action.value }));
    case 'remove':
      return items.filter((i) => i.key !== action.key);
    case 'clear':
      return [];
    default:
      return items;
  }
}

const sum = (list) => list.reduce((total, i) => total + i.qty * i.price, 0);

export default function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, undefined, load);
  const [isOpen, setIsOpen] = useState(false);
  const [quickItem, setQuickItem] = useState(null); // item for the one-item checkout panel

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable - cart just won't persist */
    }
  }, [items]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  // mode: 'checkout' (buy this one now) or 'cart' (pick a size, then add to cart)
  const openQuickCheckout = useCallback((item, mode = 'checkout') => setQuickItem({ ...item, mode }), []);
  const closeQuickCheckout = useCallback(() => setQuickItem(null), []);

  const value = useMemo(() => {
    // every line, for showing the cart sections
    const readyItems = items.filter((i) => i.status !== 'pre-order');
    const preorderItems = items.filter((i) => i.status === 'pre-order');

    // only ticked lines count towards what the customer is paying for
    const selectedItems = items.filter((i) => i.selected);
    const readySelected = selectedItems.filter((i) => i.status !== 'pre-order');
    const preorderSelected = selectedItems.filter((i) => i.status === 'pre-order');
    const readySubtotal = sum(readySelected);
    const preorderSubtotal = sum(preorderSelected);
    const depositPercent = aboutContent.settings.depositPercent;
    const deposit = Math.round((preorderSubtotal * depositPercent) / 100);

    return {
      items,
      readyItems,
      preorderItems,
      selectedItems,
      hasReadySelected: readySelected.length > 0,
      hasPreorderSelected: preorderSelected.length > 0,
      allSelected: items.length > 0 && selectedItems.length === items.length,
      isOpen,
      openCart,
      closeCart,
      quickItem,
      openQuickCheckout,
      closeQuickCheckout,
      count: items.reduce((total, i) => total + i.qty, 0),
      selectedCount: selectedItems.reduce((total, i) => total + i.qty, 0),
      subtotal: readySubtotal + preorderSubtotal,
      readySubtotal,
      preorderSubtotal,
      depositPercent,
      deposit,
      dueNow: readySubtotal + deposit,
      balanceLater: preorderSubtotal - deposit,
      addItem: (item, qty = 1) =>
        dispatch({ type: 'add', qty, item: { ...item, key: makeKey(item.id, item.size) } }),
      increase: (key) => dispatch({ type: 'increase', key }),
      decrease: (key) => dispatch({ type: 'decrease', key }),
      removeItem: (key) => dispatch({ type: 'remove', key }),
      toggleItem: (key) => dispatch({ type: 'toggle', key }),
      setAllSelected: (value) => dispatch({ type: 'select-all', value }),
      clearCart: () => dispatch({ type: 'clear' }),
    };
  }, [items, isOpen, openCart, closeCart, quickItem, openQuickCheckout, closeQuickCheckout]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
