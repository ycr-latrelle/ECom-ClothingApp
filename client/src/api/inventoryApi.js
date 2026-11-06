// Inventory API service (scaffolding only).
//
// The ASP.NET Core inventory backend does not exist yet, so this file
// deliberately contains no endpoint URLs, request payloads or response shapes.
// Until they are filled in below, every call rejects with
// InventoryUnavailableError, which the Inventory screen shows as a normal
// "not available yet" state rather than an error.
//
// To connect the real backend, edit INVENTORY_API_CONFIG only:
//
//   listPath    - GET path returning the inventory records.
//   summaryPath - GET path returning the overview figures.
//   adjustPath  - function (productId) => path for a stock adjustment.
//   mapRecords  - (rawResponse) => InventoryRecord[]
//   mapSummary  - (rawResponse) => InventorySummary
//
// The mappers convert whatever the backend sends into the two internal shapes
// below, so AdminInventory.jsx and utils/inventory.js never need to change.
//
// @typedef {Object} InventoryRecord
// @property {string|number} productId  Matches the product `id` from the admin products API.
// @property {number}        stock      Available units.
// @property {string}  [sku]
// @property {number}  [lowStockThreshold]  Only set when the backend defines one.
// @property {string}  [updatedAt]          ISO 8601 timestamp.
//
// @typedef {Object} InventorySummary
// @property {number} totalStockUnits
// @property {number} lowStockProducts
// @property {number} outOfStockProducts

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(
  /\/+$/,
  '',
);

export const INVENTORY_API_CONFIG = {
  listPath: null,
  summaryPath: null,
  adjustPath: null,
  mapRecords: null,
  mapSummary: null,
};

export class InventoryUnavailableError extends Error {
  constructor(message = 'The inventory API is not available yet.') {
    super(message);
    this.name = 'InventoryUnavailableError';
  }
}

// What the screen is allowed to attempt. A capability is only on when both its
// path and (where a response is parsed) its mapper have been provided.
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

  return { Authorization: `Bearer ${token}` };
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
        `Request failed (HTTP ${response.status}).`,
    );
  }

  return result;
}

export async function fetchInventory(user) {
  const { listPath, mapRecords } = INVENTORY_API_CONFIG;

  if (!listPath || !mapRecords) throw new InventoryUnavailableError();

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

  if (!summaryPath || !mapSummary) throw new InventoryUnavailableError();

  const headers = await getAuthHeaders(user);

  const response = await fetch(`${API_BASE_URL}${summaryPath}`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  return mapSummary(await handleResponse(response));
}

// The request body is defined by the backend contract, so it is passed through
// untouched. The Inventory screen does not call this yet: the adjust-stock
// control stays disabled until the contract and its form exist.
export async function adjustInventoryStock(user, productId, payload) {
  const { adjustPath } = INVENTORY_API_CONFIG;

  if (!adjustPath) throw new InventoryUnavailableError();

  const headers = await getAuthHeaders(user);

  const response = await fetch(`${API_BASE_URL}${adjustPath(productId)}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}
