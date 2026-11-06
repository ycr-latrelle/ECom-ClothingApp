
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

export const getProductImage = (product) =>
  product?.image || product?.imagePath || product?.image_path || '';

export const getProductAvailability = (product) => product?.status || 'ready';

export const isProductActive = (product) =>
  product?.isActive ?? product?.is_active ?? true;

export function getInventoryStatus(record) {
  if (!record) return INVENTORY_STATUS.UNKNOWN;

  const available = Number(record.availableQuantity);

  if (!Number.isFinite(available)) return INVENTORY_STATUS.UNKNOWN;
  if (available <= 0) return INVENTORY_STATUS.OUT_OF_STOCK;

  const threshold = record.lowStockThreshold;

  if (
    threshold !== null &&
    threshold !== undefined &&
    Number.isFinite(Number(threshold)) &&
    available <= Number(threshold)
  ) {
    return INVENTORY_STATUS.LOW_STOCK;
  }

  return INVENTORY_STATUS.IN_STOCK;
}

export function getProductInventory(records, productId) {
  return records.filter(
    (record) => String(record.productId) === String(productId),
  );
}

export function getProductStockTotal(records) {
  return records.reduce(
    (total, record) => total + Number(record.availableQuantity || 0),
    0,
  );
}

export function filterInventoryRows(rows, filters) {
  const query = (filters.search || '').trim().toLowerCase();
  const category = filters.category || 'all';
  const productStatus = filters.productStatus || 'all';
  const inventoryStatus = filters.inventoryStatus || 'all';

  return rows.filter(({ product, records }) => {
    const matchesSearch =
      !query ||
      [
        product.name,
        product.slug,
        product.id,
        product.category,
        ...records.map((record) => record.sku),
        ...records.map((record) => record.color),
        ...records.map((record) => record.size),
      ].some((value) =>
        String(value ?? '').toLowerCase().includes(query),
      );

    const matchesCategory =
      category === 'all' || product.category === category;

    const availability = getProductAvailability(product);
    const active = isProductActive(product);

    const matchesProductStatus =
      productStatus === 'all' ||
      (productStatus === 'active' && active) ||
      (productStatus === 'inactive' && !active) ||
      (productStatus === 'ready' && availability === 'ready') ||
      (productStatus === 'pre-order' && availability === 'pre-order');

    const statuses = records.map(getInventoryStatus);

    const matchesInventory =
      inventoryStatus === 'all' ||
      statuses.includes(inventoryStatus);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesProductStatus &&
      matchesInventory
    );
  });
}

export function sortInventoryRows(rows, sort) {
  const sorted = [...rows];

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
      return sorted.sort(
        (a, b) =>
          getProductStockTotal(a.records) -
          getProductStockTotal(b.records),
      );

    case 'stock-desc':
      return sorted.sort(
        (a, b) =>
          getProductStockTotal(b.records) -
          getProductStockTotal(a.records),
      );

    default:
      return sorted;
  }
}
