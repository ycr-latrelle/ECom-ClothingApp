import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  filterInventoryRows,
  getInventoryStatus,
  INVENTORY_STATUS,
  sortInventoryRows,
} from './inventory.js';

const row = (product, record = null) => ({ product, record });

const rows = [
  row(
    { id: 'a', name: 'Boxy Tee', slug: 'boxy-tee', category: 'tops' },
    { productId: 'a', sku: 'TEE-001', stock: 12, updatedAt: '2026-10-01T00:00:00Z' },
  ),
  row(
    { id: 'b', name: 'Cargo Pants', slug: 'cargo-pants', category: 'bottoms', status: 'pre-order' },
    { productId: 'b', stock: 0, updatedAt: '2026-11-01T00:00:00Z' },
  ),
  row(
    { id: 'c', name: 'Anorak', slug: 'anorak', category: 'tops', isActive: false },
    { productId: 'c', stock: 3, lowStockThreshold: 5 },
  ),
  row({ id: 'd', name: 'Beanie', slug: 'beanie', category: 'accessories' }),
];

test('status is unknown when there is no record or no usable quantity', () => {
  assert.equal(getInventoryStatus(null), INVENTORY_STATUS.UNKNOWN);
  assert.equal(getInventoryStatus({}), INVENTORY_STATUS.UNKNOWN);
  assert.equal(getInventoryStatus({ stock: 'abc' }), INVENTORY_STATUS.UNKNOWN);
});

test('zero or negative stock is out of stock', () => {
  assert.equal(getInventoryStatus({ stock: 0 }), INVENTORY_STATUS.OUT_OF_STOCK);
  assert.equal(getInventoryStatus({ stock: -2 }), INVENTORY_STATUS.OUT_OF_STOCK);
});

test('low stock is only reported when the record carries a threshold', () => {
  assert.equal(getInventoryStatus({ stock: 3 }), INVENTORY_STATUS.IN_STOCK);
  assert.equal(
    getInventoryStatus({ stock: 3, lowStockThreshold: 5 }),
    INVENTORY_STATUS.LOW_STOCK,
  );
  assert.equal(
    getInventoryStatus({ stock: 6, lowStockThreshold: 5 }),
    INVENTORY_STATUS.IN_STOCK,
  );
});

test('search matches name, slug, product id and SKU', () => {
  const ids = (search) =>
    filterInventoryRows(rows, { search }).map((r) => r.product.id);

  assert.deepEqual(ids('cargo'), ['b']);
  assert.deepEqual(ids('boxy-tee'), ['a']);
  assert.deepEqual(ids('tee-001'), ['a']);
  assert.deepEqual(ids('d'), ['d']); // product id
  assert.deepEqual(ids('no-such-thing'), []);
});

test('category and product status filters', () => {
  const ids = (filters) => filterInventoryRows(rows, filters).map((r) => r.product.id);

  assert.deepEqual(ids({ category: 'tops' }), ['a', 'c']);
  assert.deepEqual(ids({ productStatus: 'inactive' }), ['c']);
  assert.deepEqual(ids({ productStatus: 'active' }), ['a', 'b', 'd']);
  assert.deepEqual(ids({ productStatus: 'pre-order' }), ['b']);
});

test('inventory status filter never matches rows without data as in/low/out', () => {
  const ids = (inventoryStatus) =>
    filterInventoryRows(rows, { inventoryStatus }).map((r) => r.product.id);

  assert.deepEqual(ids(INVENTORY_STATUS.IN_STOCK), ['a']);
  assert.deepEqual(ids(INVENTORY_STATUS.LOW_STOCK), ['c']);
  assert.deepEqual(ids(INVENTORY_STATUS.OUT_OF_STOCK), ['b']);
  assert.deepEqual(ids(INVENTORY_STATUS.UNKNOWN), ['d']);
});

test('sorting by name', () => {
  const names = (sort) => sortInventoryRows(rows, sort).map((r) => r.product.name);

  assert.deepEqual(names('name-asc'), ['Anorak', 'Beanie', 'Boxy Tee', 'Cargo Pants']);
  assert.deepEqual(names('name-desc'), ['Cargo Pants', 'Boxy Tee', 'Beanie', 'Anorak']);
});

test('sorting by stock and date keeps unknown values last in both directions', () => {
  const ids = (sort) => sortInventoryRows(rows, sort).map((r) => r.product.id);

  assert.deepEqual(ids('stock-asc'), ['b', 'c', 'a', 'd']);
  assert.deepEqual(ids('stock-desc'), ['a', 'c', 'b', 'd']);
  // c has no updatedAt, d has no record: both unknown, so both last.
  assert.deepEqual(ids('updated-desc').slice(0, 2), ['b', 'a']);
  assert.deepEqual(ids('updated-asc').slice(0, 2), ['a', 'b']);
});

test('sorting returns a copy and default keeps the original order', () => {
  const sorted = sortInventoryRows(rows, 'default');

  assert.notEqual(sorted, rows);
  assert.deepEqual(sorted.map((r) => r.product.id), ['a', 'b', 'c', 'd']);
});
