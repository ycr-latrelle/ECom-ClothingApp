import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { CartContext, MAX_QTY } from './cart-context.js';
import { useProducts } from './ProductsProvider.jsx';
import { aboutContent } from '../data/aboutContent.js';

const STORAGE_KEY = 'thread-theory-cart';

const makeKey = (id, size) => (size ? `${id}::${size}` : id);
const clamp = (qty) => Math.min(MAX_QTY, qty);

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved)) return [];

    return saved.map((item) => ({
      ...item,
      key: item.key ?? makeKey(item.id, item.size),
      qty: clamp(item.qty),
      selected: item.selected ?? true,
    }));
  } catch {
    return [];
  }
}

function migrateCartItems(items, products) {
  const productsById = new Map(
    products.map((product) => [String(product.id), product]),
  );
  const productsBySlug = new Map(
    products
      .filter((product) => product.slug)
      .map((product) => [product.slug, product]),
  );

  return items.reduce((migrated, item) => {
    const product =
      productsById.get(String(item.id)) ??
      productsBySlug.get(String(item.id));

    // Keep unmatched lines so a catalog fetch can't silently delete cart data.
    if (!product) {
      migrated.push(item);
      return migrated;
    }

    const id = String(product.id);
    const updatedItem = {
      ...item,
      id,
      key: makeKey(id, item.size),
      name: product.name,
      price: Number(product.price),
      image: product.image,
      category: product.category,
      status: product.status,
    };

    const existingIndex = migrated.findIndex(
      (line) => line.key === updatedItem.key,
    );

    if (existingIndex === -1) {
      migrated.push(updatedItem);
    } else {
      const existing = migrated[existingIndex];
      migrated[existingIndex] = {
        ...existing,
        ...updatedItem,
        qty: clamp(existing.qty + updatedItem.qty),
        selected: existing.selected || updatedItem.selected,
      };
    }

    return migrated;
  }, []);
}

function reducer(items, action) {
  switch (action.type) {
    case 'sync-products':
      return migrateCartItems(items, action.products);

    case 'add': {
      const exists = items.find((item) => item.key === action.item.key);

      if (exists) {
        return items.map((item) =>
          item.key === exists.key
            ? {
                ...item,
                qty: clamp(item.qty + action.qty),
                selected: true,
              }
            : item,
        );
      }

      return [
        ...items,
        { ...action.item, qty: clamp(action.qty), selected: true },
      ];
    }

    case 'increase':
      return items.map((item) =>
        item.key === action.key
          ? { ...item, qty: clamp(item.qty + 1) }
          : item,
      );

    case 'decrease':
      return items
        .map((item) =>
          item.key === action.key
            ? { ...item, qty: item.qty - 1 }
            : item,
        )
        .filter((item) => item.qty > 0);

    case 'toggle':
      return items.map((item) =>
        item.key === action.key
          ? { ...item, selected: !item.selected }
          : item,
      );

    case 'select-all':
      return items.map((item) => ({ ...item, selected: action.value }));

    case 'remove':
      return items.filter((item) => item.key !== action.key);

    case 'clear':
      return [];

    default:
      return items;
  }
}

const sum = (list) =>
  list.reduce((total, item) => total + item.qty * item.price, 0);

export default function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, undefined, load);
  const [isOpen, setIsOpen] = useState(false);
  const [quickItem, setQuickItem] = useState(null);
  const { products, loading: productsLoading } = useProducts();

  useEffect(() => {
    if (productsLoading || products.length === 0) return;

    dispatch({ type: 'sync-products', products });
  }, [products, productsLoading]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Cart persistence is unavailable in this browser.
    }
  }, [items]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const openQuickCheckout = useCallback((item, mode = 'checkout') => {
    setQuickItem({ ...item, mode });
  }, []);

  const closeQuickCheckout = useCallback(() => setQuickItem(null), []);

  const value = useMemo(() => {
    const readyItems = items.filter((item) => item.status !== 'pre-order');
    const preorderItems = items.filter((item) => item.status === 'pre-order');

    const selectedItems = items.filter((item) => item.selected);
    const readySelected = selectedItems.filter(
      (item) => item.status !== 'pre-order',
    );
    const preorderSelected = selectedItems.filter(
      (item) => item.status === 'pre-order',
    );

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
      count: items.reduce((total, item) => total + item.qty, 0),
      selectedCount: selectedItems.reduce(
        (total, item) => total + item.qty,
        0,
      ),
      subtotal: readySubtotal + preorderSubtotal,
      readySubtotal,
      preorderSubtotal,
      depositPercent,
      deposit,
      dueNow: readySubtotal + deposit,
      balanceLater: preorderSubtotal - deposit,
      addItem: (item, qty = 1) =>
        dispatch({
          type: 'add',
          qty,
          item: { ...item, key: makeKey(item.id, item.size) },
        }),
      increase: (key) => dispatch({ type: 'increase', key }),
      decrease: (key) => dispatch({ type: 'decrease', key }),
      removeItem: (key) => dispatch({ type: 'remove', key }),
      toggleItem: (key) => dispatch({ type: 'toggle', key }),
      setAllSelected: (value) => dispatch({ type: 'select-all', value }),
      clearCart: () => dispatch({ type: 'clear' }),
    };
  }, [
    items,
    isOpen,
    openCart,
    closeCart,
    quickItem,
    openQuickCheckout,
    closeQuickCheckout,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}