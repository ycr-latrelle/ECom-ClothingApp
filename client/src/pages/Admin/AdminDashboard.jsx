import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchInventorySummary } from '../../api/inventoryApi.js';
import { fetchAdminOrders } from '../../api/adminOrderApi.js';
import { fetchAdminPayments } from '../../api/adminPaymentApi.js';
import { fetchAdminProducts } from '../../api/adminProductApi.js';
import { useAuth } from '../../context/useAuth.js';
import { getDashboardMetrics } from '../../utils/adminDashboard.js';
import './AdminDashboard.css';

const shortcuts = [
  {
    title: 'Manage Products',
    description: 'Create, update, and organize your store catalog.',
    path: '/admin/products',
    icon: '◇',
  },
  {
    title: 'Review Orders',
    description: 'View customer purchases and manage order progress.',
    path: '/admin/orders',
    icon: '▤',
  },
  {
    title: 'Verify Payments',
    description: 'Review customer payment submissions and receipts.',
    path: '/admin/payments',
    icon: '₱',
  },
  {
    title: 'Manage Shipments',
    description: 'Update courier details and tracking information.',
    path: '/admin/shipments',
    icon: '⇢',
  },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const [dashboard, setDashboard] = useState({
    status: 'loading',
    metrics: [],
    error: '',
    updatedAt: null,
  });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    Promise.resolve()
      .then(() => {
        if (!user) throw new Error('Sign in with an authorized admin account to load dashboard data.');

        return Promise.allSettled([
          fetchAdminProducts(user, { signal: controller.signal }),
          fetchAdminOrders(user, { signal: controller.signal }),
          fetchAdminPayments(user, { signal: controller.signal }),
          fetchInventorySummary(user, { signal: controller.signal }),
        ]);
      })
      .then((results) => {
        if (cancelled) return;

        const resourceErrors = [];
        const [productsResult, ordersResult, paymentsResult, inventoryResult] = results;
        const getData = (result, resource, fallback) => {
          if (result.status === 'fulfilled') return result.value;
          resourceErrors.push(resource);
          return fallback;
        };
        const products = getData(productsResult, 'products', null);
        const orders = getData(ordersResult, 'orders', null);
        const payments = getData(paymentsResult, 'payments', null);
        const inventory = getData(inventoryResult, 'inventory', null);
        const hasLoadedData = results.some(
          (result) => result.status === 'fulfilled',
        );

        setDashboard({
          status: !hasLoadedData
            ? 'error'
            : resourceErrors.length
              ? 'partial'
              : 'ready',
          metrics: getDashboardMetrics(products, orders, payments, inventory),
          error: resourceErrors.length
            ? `Some data could not be loaded: ${resourceErrors.join(', ')}.`
            : '',
          updatedAt: new Date(),
        });
      })
      .catch((error) => {
        if (cancelled || error?.name === 'AbortError') return;

        setDashboard({
          status: 'error',
          metrics: [],
          error: error.message || 'Dashboard data could not be loaded.',
          updatedAt: null,
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [user, reloadKey]);

  const refresh = useCallback(() => {
    setDashboard((current) => ({ ...current, status: 'loading', error: '' }));
    setReloadKey((current) => current + 1);
  }, []);

  return (
    <div className="admin-dashboard">
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">STORE MANAGEMENT</p>
          <h1>Overview</h1>
          <p className="admin-page-description">
            A live summary of products, orders, payments, and inventory.
          </p>
        </div>

        <div className="admin-dashboard-heading-actions">
          {dashboard.updatedAt && (
            <span className="admin-date-label">
              Updated {new Intl.DateTimeFormat('en-PH', {
                hour: 'numeric',
                minute: '2-digit',
              }).format(dashboard.updatedAt)}
            </span>
          )}
          <button
            type="button"
            className="admin-dashboard-refresh"
            onClick={refresh}
            disabled={dashboard.status === 'loading'}
          >
            {dashboard.status === 'loading' ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {(dashboard.status === 'error' || dashboard.status === 'partial') && (
        <div className="admin-dashboard-error" role="alert">
          <p>
            <strong>
              {dashboard.status === 'partial'
                ? 'Some dashboard data is unavailable.'
                : 'Dashboard data is unavailable.'}
            </strong>{' '}
            {dashboard.error}
          </p>
          <button type="button" onClick={refresh}>Try again</button>
        </div>
      )}

      <section
        className="admin-metrics-grid"
        aria-label="Store metrics"
        aria-busy={dashboard.status === 'loading'}
      >
        {(dashboard.status === 'ready' || dashboard.status === 'partial'
          ? dashboard.metrics
          : [
              { label: 'Products', icon: '◇' },
              { label: 'Total orders', icon: '▤' },
              { label: 'Pending orders', icon: '◷' },
              { label: 'Payment submissions', icon: '₱' },
              { label: 'Verified payments', icon: '✓' },
              { label: 'Low-stock products', icon: '!' },
            ]
        ).map((metric) => (
          <article className="admin-metric-card" key={metric.label}>
            <div className="admin-metric-top">
              <span>{metric.label}</span>
              <span className="admin-metric-icon" aria-hidden="true">{metric.icon}</span>
            </div>

            <strong className="admin-metric-value">
              {dashboard.status === 'ready' || dashboard.status === 'partial'
                ? metric.value
                : '—'}
            </strong>
            <p>
              {dashboard.status === 'loading'
                ? 'Loading live data…'
                : dashboard.status === 'error'
                  ? 'Data unavailable'
                  : metric.description}
            </p>
          </article>
        ))}
      </section>

      <section className="admin-dashboard-section">
        <div className="admin-section-heading">
          <div>
            <h2>Quick access</h2>
            <p>Common store management tasks.</p>
          </div>
        </div>

        <div className="admin-shortcuts-grid">
          {shortcuts.map((shortcut) => (
            <Link
              to={shortcut.path}
              className="admin-shortcut-card"
              key={shortcut.path}
            >
              <span className="admin-shortcut-icon" aria-hidden="true">{shortcut.icon}</span>

              <div>
                <h3>{shortcut.title}</h3>
                <p>{shortcut.description}</p>
              </div>

              <span className="admin-shortcut-arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
