const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export async function createOrder(user, orderRequest) {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is missing from the client environment.');
  }

  if (!user) {
    throw new Error('You must be signed in to place an order.');
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API_BASE_URL}/api/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderRequest),
  });

  const responseText = await response.text();
  let result = null;

  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch {
    // The API response was not JSON.
  }

  if (!response.ok) {
    throw new Error(
      result?.error ||
        result?.title ||
        `Could not create order (HTTP ${response.status}).`,
    );
  }

  if (!result?.id) {
    throw new Error('The API response did not include the new order ID.');
  }

  return result;
}

// ---------------------------------------------------------------------------
// Reading a signed-in customer's own orders.
//
// UNCONFIRMED CONTRACT: the frontend only had a confirmed POST /api/orders and
// POST /api/orders/{id}/payment-proof. These two GET calls follow the same route
// pattern, but the backend has to provide them (see docs/MY_ORDERS_FRONTEND.md).
// Ownership is enforced by the backend from the Firebase token; no customer id is
// ever sent from here.
// ---------------------------------------------------------------------------

export class OrdersApiError extends Error {
  // kind: 'auth' | 'unavailable' | 'notFound' | 'server' | 'network'
  constructor(message, { kind, status } = {}) {
    super(message);
    this.name = 'OrdersApiError';
    this.kind = kind;
    this.status = status;
  }
}

async function authorizedGet(user, path, { signal } = {}) {
  if (!API_BASE_URL) {
    throw new OrdersApiError('VITE_API_BASE_URL is missing from the client environment.', {
      kind: 'server',
    });
  }

  if (!user) {
    throw new OrdersApiError('Sign in to see your orders.', { kind: 'auth' });
  }

  const token = await user.getIdToken();
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new OrdersApiError('Could not reach the store. Check your connection and try again.', {
      kind: 'network',
    });
  }

  if (response.status === 401 || response.status === 403) {
    throw new OrdersApiError('Your session has expired. Sign in again to see your orders.', {
      kind: 'auth',
      status: response.status,
    });
  }

  if (response.status === 404) {
    throw new OrdersApiError('Not found.', { kind: 'notFound', status: 404 });
  }

  if (response.status === 405 || response.status === 501) {
    throw new OrdersApiError('This part of the store is not available yet.', {
      kind: 'unavailable',
      status: response.status,
    });
  }

  if (!response.ok) {
    throw new OrdersApiError(`Could not load your orders (HTTP ${response.status}).`, {
      kind: 'server',
      status: response.status,
    });
  }

  try {
    return await response.json();
  } catch {
    throw new OrdersApiError('The store returned an unexpected response.', { kind: 'server' });
  }
}

export const fetchMyOrders = (user, options) => authorizedGet(user, '/api/orders', options);

export const fetchMyOrder = (user, orderId, options) =>
  authorizedGet(user, `/api/orders/${encodeURIComponent(orderId)}`, options);
