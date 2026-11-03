import { useCallback, useEffect, useState } from 'react';
import { fetchMyOrders } from '../../api/orderApi.js';
import { extractOrderList, normalizeOrder } from '../../utils/orders.js';

// Loads the signed-in customer's orders from the API (never from sessionStorage),
// so signing in on another device shows the same history.
export function useMyOrders(user) {
  const [state, setState] = useState({ status: 'loading', orders: [], error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetchMyOrders(user, { signal: controller.signal })
      .then((data) => {
        const list = extractOrderList(data);
        if (!list) throw new Error('The store returned an unexpected response.');

        const orders = list
          .map(normalizeOrder)
          .filter((order) => order.id)
          .sort((a, b) => (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0));

        setState({ status: 'ready', orders, error: null });
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setState({ status: 'error', orders: [], error });
      });

    return () => controller.abort();
  }, [user, attempt]);

  const reload = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading', error: null }));
    setAttempt((count) => count + 1);
  }, []);

  return { ...state, reload };
}
