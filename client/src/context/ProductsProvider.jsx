import { useEffect, useState } from 'react';
import { fetchProducts } from '../api/productApi.js';
import { ProductsContext } from './products-context.js';

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
