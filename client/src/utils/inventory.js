// Presentation helpers for the Admin Inventory screen.
//
// A "row" is { product, record }:
//   product - an item from the existing admin products API.
//   record  - the matching inventory record, or null when none is available.
//
// `record` is the frontend's own internal shape (see inventoryApi.js). Nothing
// here is derived from, or assumes, a backend response format. While the
// inventory backend does not exist every record is null, and every helper
// treats that as "unknown" rather than guessing a quantity.

export const INVENTORY_STATUS = Object.freeze({
  IN_STOCK: 'in-stock',
  LOW_STOCK: 'low-stock',
  OUT_OF_STOCK: 'out-of-stock',
  UNKNOWN: 'unknown',
});

export const INVENTORY_STATUS_LABELS = Object.freeze({
  [INVENTORY_STATUS.IN_STOCK]: 'In stock',
  [INVENTORY_STATUS.LOW_STOCK]: 'Low stock',
  [INVENTORY_STATUS.OUT_OF_STOCK]: 'Out of stock',
  [INVENTORY_STATUS.UNKNOWN]: 'Unknown',
});

// Product accessors. These mirror the ones used by AdminProducts so both
// screens read the same product fields the same way.
export const getProductImage = (product) =>
  product?.image || product?.imagePath || product?.image_path || '';

export const getProductAvailability = (product) => product?.status || 'ready';

export const isProductActive = (product) =>
  product?.isActive ?? product?.is_active ?? true;

function toNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return Number.NaN;
}

export function getStockQuantity(record) {
  const stock = toNumber(record?.stock);
  return Number.isFinite(stock) ? stock : null;
}

export function getUpdatedTime(record) {
  if (!record?.updatedAt) return null;
  const time = Date.parse(record.updatedAt);
  return Number.isFinite(time) ? time : null;
}

// Derives the inventory status for one record.
//
// No low-stock threshold is defined anywhere yet, so none is assumed: a record
// is only "Low stock" when the record itself carries a threshold. Without one,
// a positive quantity is reported as "In stock" and zero as "Out of stock".
export function getInventoryStatus(record) {
  const stock = getStockQuantity(record);

  if (stock === null) return INVENTORY_STATUS.UNKNOWN;
  if (stock <= 0) return INVENTORY_STATUS.OUT_OF_STOCK;

  const threshold = toNumber(record?.lowStockThreshold);

  if (Number.isFinite(threshold) && stock <= threshold) {
    return INVENTORY_STATUS.LOW_STOCK;
  }

  return INVENTORY_STATUS.IN_STOCK;
}

export function filterInventoryRows(rows, filters) {
  const query = (filters.search || '').trim().toLowerCase();
  const category = filters.category || 'all';
  const productStatus = filters.productStatus || 'all';
  const inventoryStatus = filters.inventoryStatus || 'all';

  return rows.filter(({ product, record }) => {
    const matchesSearch =
      !query ||
      [product.name, product.slug, product.id, record?.sku].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(query),
      );

    const matchesCategory = category === 'all' || product.category === category;

    const availability = getProductAvailability(product);
    const active = isProductActive(product);

    const matchesProductStatus =
      productStatus === 'all' ||
      (productStatus === 'active' && active) ||
      (productStatus === 'inactive' && !active) ||
      (productStatus === 'ready' && availability === 'ready') ||
      (productStatus === 'pre-order' && availability === 'pre-order');

    const matchesInventory =
      inventoryStatus === 'all' ||
      getInventoryStatus(record) === inventoryStatus;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesProductStatus &&
      matchesInventory
    );
  });
}

// Sorts a copy of `rows`. Rows with no known value for the chosen field are
// always placed last, whichever direction is selected, so they never read as
// "zero stock" or "oldest".
export function sortInventoryRows(rows, sort) {
  const sorted = [...rows];

  const byNumber = (read, direction) => (a, b) => {
    const left = read(a);
    const right = read(b);

    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;

    return direction === 'asc' ? left - right : right - left;
  };

  switch (sort) {
    case 'name-asc':
      return sorted.sort((a, b) =>
        (a.product.name || '').localeCompare(b.product.name || ''),
      );
    case 'name-desc':
      return sorted.sort((a, b) =>
        (b.product.name || '').localeCompare(a.product.name || ''),
      );
    case 'stock-asc':
      return sorted.sort(byNumber((row) => getStockQuantity(row.record), 'asc'));
    case 'stock-desc':
      return sorted.sort(
        byNumber((row) => getStockQuantity(row.record), 'desc'),
      );
    case 'updated-desc':
      return sorted.sort(byNumber((row) => getUpdatedTime(row.record), 'desc'));
    case 'updated-asc':
      return sorted.sort(byNumber((row) => getUpdatedTime(row.record), 'asc'));
    default:
      return sorted;
  }
}
