
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export class AdminOrdersApiError extends Error {
  constructor(message, { status, kind } = {}) {
    super(message);
    this.name = 'AdminOrdersApiError';
    this.status = status;
    this.kind = kind;
  }
}

export async function fetchAdminOrders(user, { signal } = {}) {
  if (!API_BASE_URL) {
    throw new AdminOrdersApiError(
      'VITE_API_BASE_URL is missing from the client environment.',
      { kind: 'configuration' },
    );
  }

  if (!user) {
    throw new AdminOrdersApiError(
      'You must be signed in to view orders.',
      { kind: 'auth' },
    );
  }

  const token = await user.getIdToken();

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/admin/orders`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;

    throw new AdminOrdersApiError(
      'Could not connect to the server. Check your connection and try again.',
      { kind: 'network' },
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new AdminOrdersApiError(
      'You are not authorized to access administrative orders.',
      { kind: 'auth', status: response.status },
    );
  }

  if (response.status === 404 || response.status === 405 || response.status === 501) {
    throw new AdminOrdersApiError(
      'The admin orders API has not been implemented yet.',
      { kind: 'unavailable', status: response.status },
    );
  }

  if (!response.ok) {
    throw new AdminOrdersApiError(
      `Could not load orders (HTTP ${response.status}).`,
      { kind: 'server', status: response.status },
    );
  }

  let result;

  try {
    result = await response.json();
  } catch {
    throw new AdminOrdersApiError(
      'The server returned an invalid response.',
      { kind: 'server' },
    );
  }

  if (!Array.isArray(result)) {
    throw new AdminOrdersApiError(
      'The admin orders API returned an unexpected data format.',
      { kind: 'server' },
    );
  }

  return result;
}
