import { createContext, useContext, useEffect, useState } from 'react';
import { fetchProducts } from '../api/productApi.js';

const ProductsContext = createContext(null);

export default function ProductsProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchProducts({ signal: controller.signal })
      .then((data) => {
        if (active) setProducts(data);
      })
      .catch((err) => {
        if (active && err.name !== 'AbortError') {
          setError(err.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return (
    <ProductsContext.Provider value={{ products, loading, error }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);

  if (!context) {
    throw new Error('useProducts must be used inside ProductsProvider.');
  }

  return context;
}