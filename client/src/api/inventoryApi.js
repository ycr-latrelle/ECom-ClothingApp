
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(
  /\/+$/,
  '',
);

export const INVENTORY_API_CONFIG = {
  listPath: '/api/admin/inventory',
  summaryPath: '/api/admin/inventory/summary',
  adjustPath: null,

  mapRecords(rawResponse) {
    if (!Array.isArray(rawResponse)) {
      throw new Error('The inventory API returned an unexpected response.');
    }

    return rawResponse.map((item) => ({
      productId: item.productId,
      stock: Number(item.stock ?? 0),
      sku: item.sku ?? null,
      lowStockThreshold:
        item.lowStockThreshold == null
          ? null
          : Number(item.lowStockThreshold),
      updatedAt: item.updatedAt ?? null,
    }));
  },

  mapSummary(rawResponse) {
    if (!rawResponse || typeof rawResponse !== 'object') {
      throw new Error('The inventory summary API returned an unexpected response.');
    }

    return {
      totalStockUnits: Number(rawResponse.totalStockUnits ?? 0),
      lowStockProducts: Number(rawResponse.lowStockProducts ?? 0),
      outOfStockProducts: Number(rawResponse.outOfStockProducts ?? 0),
    };
  },
};

export class InventoryUnavailableError extends Error {
  constructor(message = 'The inventory API is not available yet.') {
    super(message);
    this.name = 'InventoryUnavailableError';
  }
}

export function getInventoryCapabilities() {
  const { listPath, summaryPath, adjustPath, mapRecords, mapSummary } =
    INVENTORY_API_CONFIG;

  return {
    list: Boolean(listPath && mapRecords),
    summary: Boolean(summaryPath && mapSummary),
    adjust: Boolean(adjustPath),
  };
}

async function getAuthHeaders(user) {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is missing from the client environment.');
  }

  if (!user) {
    throw new Error('You must be signed in to manage inventory.');
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
    // Keep the response as null when it is not JSON.
  }

  if (!response.ok) {
    throw new Error(
      result?.error ||
        result?.title ||
        `Request failed (HTTP ${response.status}).`,
    );
  }

  return result;
}

export async function fetchInventory(user) {
  const { listPath, mapRecords } = INVENTORY_API_CONFIG;

  if (!listPath || !mapRecords) {
    throw new InventoryUnavailableError();
  }

  const headers = await getAuthHeaders(user);

  const response = await fetch(`${API_BASE_URL}${listPath}`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  const records = mapRecords(await handleResponse(response));

  if (!Array.isArray(records)) {
    throw new Error('The inventory API returned an unexpected response.');
  }

  return records;
}

export async function fetchInventorySummary(user) {
  const { summaryPath, mapSummary } = INVENTORY_API_CONFIG;

  if (!summaryPath || !mapSummary) {
    throw new InventoryUnavailableError();
  }

  const headers = await getAuthHeaders(user);

  const response = await fetch(`${API_BASE_URL}${summaryPath}`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  return mapSummary(await handleResponse(response));
}

// Stock adjustment remains disabled until its backend workflow is implemented.
export async function adjustInventoryStock(user, productId, payload) {
  const { adjustPath } = INVENTORY_API_CONFIG;

  if (!adjustPath) {
    throw new InventoryUnavailableError(
      'Stock adjustment is not available yet.',
    );
  }

  const headers = await getAuthHeaders(user);

  const response = await fetch(`${API_BASE_URL}${adjustPath(productId)}`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}
