
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import '../../styles/admin-theme.css';
import './AdminLayout.css';

const navigation = [
  {
    section: 'WORKSPACE',
    items: [
      { label: 'Overview', path: '/admin', icon: '◫', end: true },
    ],
  },
  {
    section: 'STORE MANAGEMENT',
    items: [
      { label: 'Products', path: '/admin/products', icon: '◇' },
      { label: 'Inventory', path: '/admin/inventory', icon: '▦' },
      { label: 'Orders', path: '/admin/orders', icon: '▤' },
      { label: 'Payments', path: '/admin/payments', icon: '₱' },
      { label: 'Shipments', path: '/admin/shipments', icon: '⇢' },
    ],
  },
  {
    section: 'BUSINESS',
    items: [
      { label: 'Sellers', path: '/admin/sellers', icon: '♙' },
      { label: 'Reports', path: '/admin/reports', icon: '▥' },
    ],
  },
  {
    section: 'SYSTEM',
    items: [
      { label: 'Settings', path: '/admin/settings', icon: '⚙' },
      { label: 'Audit Logs', path: '/admin/audit-logs', icon: '≡' },
    ],
  },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);

    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Admin sign-out failed:', error);
      setSigningOut(false);
    }
  }

  const displayName =
    user?.displayName?.trim() ||
    user?.email?.split('@')[0] ||
    'Administrator';

  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="admin-layout">
      {sidebarOpen && (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`admin-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="admin-sidebar-brand">
          <div className="admin-brand-mark">T/T</div>

          <div>
            <strong>THREAD / THEORY</strong>
            <span>ADMINISTRATION</span>
          </div>

          <button
            type="button"
            className="admin-mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            ×
          </button>
        </div>

        <div className="admin-sidebar-content">
          {navigation.map((group) => (
            <div className="admin-nav-group" key={group.section}>
              <p className="admin-nav-heading">{group.section}</p>

              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `admin-nav-link ${isActive ? 'active' : ''}`
                  }
                >
                  <span className="admin-nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        <div className="admin-sidebar-bottom">
          <div className="admin-user-card">
            <div className="admin-user-avatar">{initial}</div>

            <div className="admin-user-details">
              <strong>{displayName}</strong>
              <span>{user?.email}</span>
            </div>
          </div>

          <button
            type="button"
            className="admin-signout"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <span>↪</span>
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-menu-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            ☰
          </button>

          <div className="admin-breadcrumb">
            <span>Thread / Theory</span>
            <span>/</span>
            <strong>Administration</strong>
          </div>

          <div className="admin-topbar-right">
            <span className="admin-preview-badge">
              Dashboard preview
            </span>
            <div className="admin-topbar-avatar">{initial}</div>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>

        <footer className="admin-footer">
          <span>THREAD / THEORY</span>
          <span>Administration Portal</span>
        </footer>
      </div>
    </div>
  );
}
