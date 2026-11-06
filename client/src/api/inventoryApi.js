
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(
  /\/+$/,
  '',
);

const INVENTORY_URL = `${API_BASE_URL}/api/admin/inventory`;

export class InventoryUnavailableError extends Error {
  constructor(message = 'The inventory API is not available.') {
    super(message);
    this.name = 'InventoryUnavailableError';
  }
}

async function getAuthHeaders(user) {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is missing from the client environment.');
  }

  if (!user) {
    throw new Error('You must be signed in to manage inventory.');
  }

  return {
    Authorization: `Bearer ${await user.getIdToken()}`,
  };
}

async function handleResponse(response) {
  const responseText = await response.text();
  let result = null;

  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch {
    // The response may not contain JSON.
  }

  if (!response.ok) {
    throw new Error(
      result?.error ||
        result?.title ||
        result?.message ||
        `Request failed (HTTP ${response.status}).`,
    );
  }

  return result;
}

function toNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function mapInventoryRecord(item) {
  return {
    productId: item.productId,
    productName: item.productName ?? '',
    color: item.color ?? null,
    size: item.size ?? null,
    sku: item.sku ?? null,
    onHandQuantity: toNumber(item.onHandQuantity, 0),
    reservedQuantity: toNumber(item.reservedQuantity, 0),
    availableQuantity: toNumber(item.availableQuantity, 0),
    lowStockThreshold: toNumber(item.lowStockThreshold),
    updatedAt: item.updatedAt ?? null,
  };
}

export function mapInventoryRecords(rawResponse) {
  if (!Array.isArray(rawResponse)) {
    throw new Error('The inventory API returned an unexpected response.');
  }

  return rawResponse.map(mapInventoryRecord);
}

export function mapInventorySummary(rawResponse) {
  if (!rawResponse || typeof rawResponse !== 'object') {
    throw new Error('The inventory summary API returned an unexpected response.');
  }

  return {
    totalStockUnits: toNumber(rawResponse.totalStockUnits, 0),
    lowStockProducts: toNumber(rawResponse.lowStockProducts, 0),
    outOfStockProducts: toNumber(rawResponse.outOfStockProducts, 0),
  };
}

export async function fetchInventory(user) {
  const headers = await getAuthHeaders(user);

  const response = await fetch(INVENTORY_URL, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  return mapInventoryRecords(await handleResponse(response));
}

export async function fetchInventorySummary(user) {
  const headers = await getAuthHeaders(user);

  const response = await fetch(`${INVENTORY_URL}/summary`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  return mapInventorySummary(await handleResponse(response));
}

export async function adjustInventoryStock(user, payload) {
  const headers = await getAuthHeaders(user);

  const response = await fetch(
    `${API_BASE_URL}/api/admin/inventory/stock`,
    {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  return handleResponse(response);
}
