import { useCallback, useEffect, useState } from 'react';
import { fetchMyOrder } from '../../api/orderApi.js';
import { normalizeOrder } from '../../utils/orders.js';

// Loads one order's details when the drawer opens.
export function useOrderDetail(user, orderId) {
  const [result, setResult] = useState({ id: null, order: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!orderId) return undefined;

    const controller = new AbortController();

    fetchMyOrder(user, orderId, { signal: controller.signal })
      .then((data) => {
        setResult({ id: orderId, order: normalizeOrder(data), error: null });
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setResult({ id: orderId, order: null, error });
      });

    return () => controller.abort();
  }, [user, orderId, attempt]);

  const retry = useCallback(() => {
    setResult({ id: null, order: null, error: null });
    setAttempt((count) => count + 1);
  }, []);

  const current = result.id === orderId ? result : { order: null, error: null };

  let status = 'idle';
  if (orderId) {
    if (current.error) status = 'error';
    else if (current.order) status = 'ready';
    else status = 'loading';
  }

  return { status, order: current.order, error: current.error, retry };
}
