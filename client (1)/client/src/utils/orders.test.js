import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildTimeline,
  extractOrderList,
  matchesFilter,
  mergeOrder,
  normalizeOrder,
  orderBucket,
  orderStats,
  paymentLabel,
  paymentTone,
  planReorder,
  safeHttpUrl,
} from './orders.js';

test('normalizeOrder reads the confirmed order fields and invents nothing', () => {
  const order = normalizeOrder({
    id: 'abc',
    orderCode: 'TT-1001',
    orderStatus: 'pending',
    paymentStatus: 'awaiting_submission',
    createdAt: '2026-10-01T08:00:00Z',
    dueToday: 500,
    balanceLater: 700,
  });

  assert.equal(order.id, 'abc');
  assert.equal(order.code, 'TT-1001');
  assert.equal(order.totals.dueToday, 500);
  assert.equal(order.totals.balance, 700);
  assert.equal(order.totals.total, undefined);
  assert.equal(order.shipment, null);
  assert.equal(order.payment, null);
  assert.deepEqual(order.items, []);
});

test('normalizeOrder falls back to the id when there is no order code', () => {
  assert.equal(normalizeOrder({ id: 'xyz' }).code, 'xyz');
});

test('order status buckets map to the filters', () => {
  assert.equal(orderBucket('pending'), 'pending');
  assert.equal(orderBucket('processing'), 'processing');
  assert.equal(orderBucket('ready_to_ship'), 'processing');
  assert.equal(orderBucket('shipped'), 'shipped');
  assert.equal(orderBucket('out_for_delivery'), 'shipped');
  assert.equal(orderBucket('delivered'), 'delivered');
  assert.equal(orderBucket('cancelled'), 'cancelled');
  assert.equal(orderBucket('something_else'), null);
  assert.equal(orderBucket('order_placed'), 'pending');
  assert.equal(orderBucket('awaiting_payment'), 'pending');
  assert.equal(orderBucket(undefined), null);
});

test('filters use the order status, not the payment status', () => {
  const order = { orderStatus: 'shipped', paymentStatus: 'pending_verification' };
  assert.equal(matchesFilter(order, 'shipped'), true);
  assert.equal(matchesFilter(order, 'pending'), false);
  assert.equal(matchesFilter(order, 'all'), true);
});

test('stats count processing and delivered orders', () => {
  const stats = orderStats([
    { orderStatus: 'processing' },
    { orderStatus: 'delivered' },
    { orderStatus: 'delivered' },
    { orderStatus: 'pending' },
  ]);
  assert.deepEqual(stats, { total: 4, processing: 1, completed: 2 });
});

test('payment labels and tones', () => {
  assert.equal(paymentLabel('awaiting_submission'), 'Awaiting payment');
  assert.equal(paymentLabel('pending_verification'), 'Pending verification');
  assert.equal(paymentLabel(undefined), 'Not available');
  assert.equal(paymentTone('rejected'), 'danger');
  assert.equal(paymentTone('verified'), 'success');
  assert.equal(paymentTone('pending_verification'), 'warning');
});

test('timeline only lists dates the order actually records', () => {
  const order = normalizeOrder({
    id: '1',
    createdAt: '2026-10-01T08:00:00Z',
    payment: { status: 'pending_verification', submittedAt: '2026-10-01T09:00:00Z' },
  });
  const timeline = buildTimeline(order);

  assert.equal(timeline.mode, 'recorded');
  assert.deepEqual(timeline.items.map((item) => item.title), ['Order placed', 'Payment submitted']);
});

test('timeline uses real history events when the API provides them', () => {
  const order = normalizeOrder({
    id: '1',
    timeline: [
      { status: 'shipped', createdAt: '2026-10-03T08:00:00Z' },
      { status: 'order_placed', createdAt: '2026-10-01T08:00:00Z', description: 'We got it' },
    ],
  });
  const timeline = buildTimeline(order);

  assert.equal(timeline.mode, 'history');
  assert.equal(timeline.items[0].title, 'Order placed');
  assert.equal(timeline.items[0].state, 'done');
  assert.equal(timeline.items[1].state, 'current');
});

test('tracking links must be http(s)', () => {
  assert.equal(safeHttpUrl('https://track.example.com/abc'), 'https://track.example.com/abc');
  assert.equal(safeHttpUrl('javascript:alert(1)'), null);
  assert.equal(safeHttpUrl('not a url'), null);
});

test('list responses can be a bare array or wrapped', () => {
  assert.deepEqual(extractOrderList([1]), [1]);
  assert.deepEqual(extractOrderList({ orders: [2] }), [2]);
  assert.equal(extractOrderList({ nope: true }), null);
});

test('reorder uses current products and reports what cannot be added', () => {
  const order = normalizeOrder({
    id: '1',
    items: [
      { productId: 'hoodie', productName: 'Hoodie', size: 'M', quantity: 2, unitPrice: 1 },
      { productId: 'gone', productName: 'Old tee', size: 'L', quantity: 1 },
      { productId: 'shoe', productName: 'Sneaker', size: '41', quantity: 1 },
      { productId: 'cap', productName: 'Cap', quantity: 50 },
    ],
  });
  const products = [
    { id: 'hoodie', name: 'Hoodie', price: 2000, sizes: ['S', 'M'] },
    { id: 'shoe', name: 'Sneaker', price: 3000, sizes: ['40', '42'] },
    { id: 'cap', name: 'Cap', price: 900, sizes: [] },
  ];

  const plan = planReorder(order, products, 10);

  assert.equal(plan.add.length, 2);
  assert.equal(plan.add[0].product.price, 2000);
  assert.equal(plan.add[0].size, 'M');
  assert.equal(plan.add[0].qty, 2);
  assert.equal(plan.add[1].product.id, 'cap');
  assert.equal(plan.add[1].size, null);
  assert.equal(plan.add[1].qty, 10);
  assert.deepEqual(
    plan.skipped.map((entry) => entry.name),
    ['Old tee', 'Sneaker'],
  );
});

test('reorder skips items marked out of stock', () => {
  const order = normalizeOrder({ id: '1', items: [{ productId: 'a', productName: 'A' }] });
  const plan = planReorder(order, [{ id: 'a', stock: 0, sizes: [] }]);
  assert.equal(plan.add.length, 0);
  assert.equal(plan.skipped[0].reason, 'is out of stock');
});

test('mergeOrder keeps list values the detail response leaves out', () => {
  const summary = normalizeOrder({
    id: '1',
    orderCode: 'TT-1',
    orderStatus: 'pending',
    dueToday: 100,
    items: [{ productId: 'a', productName: 'A', quantity: 1 }],
  });
  const detail = normalizeOrder({
    id: '1',
    orderStatus: 'processing',
    deliveryFee: 50,
    streetAddress: '1 Main St',
    shipment: { courier: 'LBC' },
  });

  const merged = mergeOrder(summary, detail);

  assert.equal(merged.orderStatus, 'processing');
  assert.equal(merged.code, 'TT-1');
  assert.equal(merged.totals.dueToday, 100);
  assert.equal(merged.totals.shippingFee, 50);
  assert.equal(merged.items.length, 1);
  assert.equal(merged.delivery.address, '1 Main St');
  assert.equal(merged.shipment.courier, 'LBC');
});
