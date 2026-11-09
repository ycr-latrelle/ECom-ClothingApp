import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getDashboardMetrics } from './adminDashboard.js';

const metricValues = (metrics) =>
  Object.fromEntries(metrics.map(({ label, value }) => [label, value]));

test('overview metrics use the admin API status fields', () => {
  const metrics = getDashboardMetrics(
    [{ isActive: true }, { isActive: false }],
    [
      { orderStatus: 'awaiting_payment' },
      { orderStatus: 'processing' },
    ],
    [
      { status: 'pending_verification', amount: 125 },
      { status: 'verified', amount: 500 },
      { status: 'rejected', amount: 900 },
    ],
    { lowStockProducts: 2, outOfStockProducts: 1 },
  );
  const values = metricValues(metrics);

  assert.equal(values.Products, '2');
  assert.equal(values['Total orders'], '2');
  assert.equal(values['Pending orders'], '1');
  assert.equal(values['Payment submissions'], '1');
  assert.match(values['Verified payments'], /500/);
  assert.equal(values['Low-stock products'], '2');
});

test('overview leaves failed resource metrics unavailable', () => {
  const values = metricValues(
    getDashboardMetrics(null, [], null, null),
  );

  assert.equal(values.Products, '—');
  assert.equal(values['Total orders'], '0');
  assert.equal(values['Payment submissions'], '—');
  assert.equal(values['Low-stock products'], '—');
});
