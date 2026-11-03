
import { Link } from 'react-router-dom';
import './AdminDashboard.css';

const metrics = [
  {
    label: 'Total Revenue',
    value: '—',
    description: 'Awaiting sales data',
    icon: '₱',
  },
  {
    label: 'Total Orders',
    value: '—',
    description: 'Awaiting order data',
    icon: '▤',
  },
  {
    label: 'Products',
    value: '—',
    description: 'Awaiting catalog data',
    icon: '◇',
  },
  {
    label: 'Pending Payments',
    value: '—',
    description: 'Awaiting payment data',
    icon: '₱',
  },
];

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
  return (
    <div className="admin-dashboard">
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">STORE MANAGEMENT</p>
          <h1>Overview</h1>
          <p className="admin-page-description">
            Welcome to your Thread / Theory administration workspace.
          </p>
        </div>

        <span className="admin-date-label">Dashboard preview</span>
      </div>

      <section className="admin-metrics-grid" aria-label="Store metrics">
        {metrics.map((metric) => (
          <article className="admin-metric-card" key={metric.label}>
            <div className="admin-metric-top">
              <span>{metric.label}</span>
              <span className="admin-metric-icon">{metric.icon}</span>
            </div>

            <strong className="admin-metric-value">{metric.value}</strong>
            <p>{metric.description}</p>
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
              <span className="admin-shortcut-icon">{shortcut.icon}</span>

              <div>
                <h3>{shortcut.title}</h3>
                <p>{shortcut.description}</p>
              </div>

              <span className="admin-shortcut-arrow">↗</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="admin-dashboard-section">
        <div className="admin-section-heading">
          <div>
            <h2>System status</h2>
            <p>Dashboard integration progress.</p>
          </div>
        </div>

        <div className="admin-status-panel">
          <div className="admin-status-row">
            <span className="admin-status-dot connected" />
            <div>
              <strong>Dashboard interface</strong>
              <p>Initial frontend layout is available.</p>
            </div>
            <span className="admin-status-label">Available</span>
          </div>

          <div className="admin-status-row">
            <span className="admin-status-dot pending" />
            <div>
              <strong>Database-backed authorization</strong>
              <p>Owner, Admin, and Seller permissions are not connected.</p>
            </div>
            <span className="admin-status-label pending-text">Pending</span>
          </div>

          <div className="admin-status-row">
            <span className="admin-status-dot pending" />
            <div>
              <strong>Dashboard analytics</strong>
              <p>Real sales and order statistics are not connected.</p>
            </div>
            <span className="admin-status-label pending-text">Pending</span>
          </div>
        </div>
      </section>
    </div>
  );
}
