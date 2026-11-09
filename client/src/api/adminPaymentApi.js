
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export class AdminPaymentsApiError extends Error {
  constructor(message, { status, kind } = {}) {
    super(message);
    this.name = 'AdminPaymentsApiError';
    this.status = status;
    this.kind = kind;
  }
}

async function getAuthHeaders(user) {
  if (!API_BASE_URL) {
    throw new AdminPaymentsApiError(
      'VITE_API_BASE_URL is missing from the client environment.',
      { kind: 'configuration' },
    );
  }

  if (!user) {
    throw new AdminPaymentsApiError(
      'You must be signed in to manage payments.',
      { kind: 'auth' },
    );
  }

  const token = await user.getIdToken();

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse(response) {
  const responseText = await response.text();

  let result = null;

  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch {
    // Response is not JSON.
  }

  if (response.status === 401 || response.status === 403) {
    throw new AdminPaymentsApiError(
      'You are not authorized to access administrative payments.',
      { kind: 'auth', status: response.status },
    );
  }

  if (!response.ok) {
    throw new AdminPaymentsApiError(
      result?.error ||
        result?.title ||
        `Request failed (HTTP ${response.status}).`,
      {
        kind: response.status === 404 ? 'not-found' : 'server',
        status: response.status,
      },
    );
  }

  return result;
}

async function request(user, path, options = {}) {
  const headers = await getAuthHeaders(user);

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {}),
      },
      cache: 'no-store',
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;

    throw new AdminPaymentsApiError(
      'Could not connect to the server. Check your connection and try again.',
      { kind: 'network' },
    );
  }

  return handleResponse(response);
}

export async function fetchAdminPayments(user, { signal } = {}) {
  const result = await request(user, '/api/admin/payments', { signal });

  if (!Array.isArray(result)) {
    throw new AdminPaymentsApiError(
      'The admin payments API returned an unexpected response.',
      { kind: 'server' },
    );
  }

  return result;
}

export async function fetchAdminPayment(user, paymentId) {
  return request(
    user,
    `/api/admin/payments/${encodeURIComponent(paymentId)}`,
  );
}

export async function fetchAdminPaymentReceipt(user, paymentId) {
  const headers = await getAuthHeaders(user);

  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}/api/admin/payments/${encodeURIComponent(paymentId)}/receipt`,
      {
        method: 'GET',
        headers,
        cache: 'no-store',
      },
    );
  } catch {
    throw new AdminPaymentsApiError(
      'Could not retrieve the payment receipt.',
      { kind: 'network' },
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new AdminPaymentsApiError(
      'You are not authorized to view this receipt.',
      { kind: 'auth', status: response.status },
    );
  }

  if (!response.ok) {
    let message = `Could not retrieve receipt (HTTP ${response.status}).`;

    try {
      const result = await response.json();
      message = result?.error || result?.title || message;
    } catch {
      // Keep the default message.
    }

    throw new AdminPaymentsApiError(message, {
      kind: 'server',
      status: response.status,
    });
  }

  return response.blob();
}

export async function verifyAdminPayment(user, paymentId) {
  return request(
    user,
    `/api/admin/payments/${encodeURIComponent(paymentId)}/verify`,
    {
      method: 'PUT',
    },
  );
}

export async function rejectAdminPayment(user, paymentId, reason) {
  return request(
    user,
    `/api/admin/payments/${encodeURIComponent(paymentId)}/reject`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    },
  );
}
