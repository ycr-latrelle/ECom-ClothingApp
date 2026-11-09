
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/useAuth.js';
import { fetchAdminOrders, AdminOrdersApiError } from '../../api/adminOrderApi.js';
import AdminDataTable from '../../components/Admin/AdminDataTable.jsx';
import AdminModal from '../../components/Admin/AdminModal.jsx';
import './AdminOrders.css';

const PAGE_SIZE = 8;

const ORDER_STATUSES = [
  'awaiting_payment',
  'processing',
  'ready_for_shipment',
  'shipped',
  'completed',
  'cancelled',
];

const PAYMENT_STATUSES = [
  'awaiting_submission',
  'pending_verification',
  'verified',
  'rejected',
];

const money = (value) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const dateTime = (value) => {
  if (!value) return '—';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
};

const label = (value) =>
  String(value || 'Unknown')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());

const getOrderTotal = (order) =>
  Number(order.subtotal ?? (
    Number(order.readySubtotal || 0) +
    Number(order.preorderSubtotal || 0)
  ));

const getItemCount = (order) =>
  (order.items || []).reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );

function StatusBadge({ value, type = '' }) {
  const normalized = String(value || 'unknown')
    .toLowerCase()
    .replaceAll('_', '-');

  return (
    <span className={`ao-status ao-status-${normalized} ${type}`}>
      {label(value)}
    </span>
  );
}

function SummaryCard({ title, value, description }) {
  return (
    <article className="ao-summary-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{description}</small>
    </article>
  );
}

export default function AdminOrders() {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const [selectedOrder, setSelectedOrder] = useState(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!user) {
      setStatus('error');
      setError('You must be signed in to view administrative orders.');
      return undefined;
    }

    const controller = new AbortController();

    setStatus('loading');
    setError('');

    fetchAdminOrders(user, { signal: controller.signal })
      .then((data) => {
        setOrders(data);
        setStatus('ready');
      })
      .catch((requestError) => {
        if (requestError?.name === 'AbortError') return;

        setOrders([]);

        if (requestError instanceof AdminOrdersApiError &&
            requestError.kind === 'unavailable') {
          setStatus('unavailable');
        } else {
          setStatus('error');
          setError(requestError.message || 'Could not load orders.');
        }
      });

    return () => controller.abort();
  }, [user, reloadKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const summary = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((order) =>
      ['awaiting_payment', 'pending'].includes(order.orderStatus),
    ).length,
    processing: orders.filter((order) =>
      ['processing', 'ready_for_shipment'].includes(order.orderStatus),
    ).length,
    completed: orders.filter((order) =>
      order.orderStatus === 'completed',
    ).length,
    cancelled: orders.filter((order) =>
      order.orderStatus === 'cancelled',
    ).length,
  }), [orders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = orders.filter((order) => {
      const matchesSearch = !query || [
        order.orderCode,
        order.customerFullName,
        order.customerEmail,
      ].some((value) => String(value || '').toLowerCase().includes(query));

      const matchesOrderStatus =
        orderStatus === 'all' || order.orderStatus === orderStatus;

      const matchesPaymentStatus =
        paymentStatus === 'all' || order.paymentStatus === paymentStatus;

      return matchesSearch && matchesOrderStatus && matchesPaymentStatus;
    });

    return filtered.sort((a, b) => {
      const first = new Date(a.createdAt || 0).getTime();
      const second = new Date(b.createdAt || 0).getTime();

      return sort === 'oldest' ? first - second : second - first;
    });
  }, [orders, search, orderStatus, paymentStatus, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageOrders = filteredOrders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const orderColumns = [
    { key: 'order', label: 'Order' },
    { key: 'customer', label: 'Customer' },
    { key: 'date', label: 'Date' },
    { key: 'items', label: 'Items' },
    { key: 'total', label: 'Total' },
    { key: 'payment', label: 'Payment' },
    { key: 'status', label: 'Order status' },
    { key: 'actions', label: '' },
  ];

  const renderOrderRow = (order) => (
    <>
      <td>
        <strong className="ao-order-code">{order.orderCode || '—'}</strong>
        {order.isTest && <small className="ao-test-label">Test order</small>}
      </td>
      <td>
        <div className="ao-customer-cell">
          <strong>{order.customerFullName || 'Unknown customer'}</strong>
          <small>{order.customerEmail || '—'}</small>
        </div>
      </td>
      <td>{dateTime(order.createdAt)}</td>
      <td>{getItemCount(order)}</td>
      <td className="ao-total">{money(getOrderTotal(order))}</td>
      <td><StatusBadge value={order.paymentStatus} /></td>
      <td><StatusBadge value={order.orderStatus} /></td>
      <td>
        <button
          type="button"
          className="ao-view-button"
          onClick={() => setSelectedOrder(order)}
        >
          View details
        </button>
      </td>
    </>
  );

  function updateFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  function clearFilters() {
    setSearch('');
    setOrderStatus('all');
    setPaymentStatus('all');
    setSort('newest');
    setPage(1);
  }

  function reload() {
    setSelectedOrder(null);
    setReloadKey((value) => value + 1);
  }

  return (
    <section className="admin-orders">
      <header className="admin-products-heading">
        <div>
          <p className="eyebrow">STORE MANAGEMENT</p>
          <h1>Orders</h1>
          <p className="admin-page-description">
            Review customer orders and monitor their progress.
          </p>
        </div>

        <button
          type="button"
          className="ap-secondary-button"
          onClick={reload}
          disabled={status === 'loading'}
        >
          ↻ Refresh orders
        </button>
      </header>

      {status === 'unavailable' && (
        <div className="ap-preview-notice">
          <span className="ap-notice-icon">i</span>
          <p>
            <strong>Admin orders API is not connected yet.</strong>{' '}
            The interface is ready, but the backend needs a dedicated
            Owner/Admin endpoint before it can retrieve the store's orders.
            Customer order endpoints are intentionally not used here.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="ap-preview-notice ao-error-notice" role="alert">
          <span className="ap-notice-icon">!</span>
          <p>
            <strong>Orders could not be loaded.</strong> {error}
            {' '}
            <button type="button" onClick={reload}>Try again</button>
          </p>
        </div>
      )}

      <div className="ap-summary-grid">
        <SummaryCard
          title="Total orders"
          value={status === 'ready' ? summary.total : '—'}
          description="All recorded orders"
        />
        <SummaryCard
          title="Pending orders"
          value={status === 'ready' ? summary.pending : '—'}
          description="Awaiting payment or action"
        />
        <SummaryCard
          title="Processing"
          value={status === 'ready' ? summary.processing : '—'}
          description="Being prepared for delivery"
        />
        <SummaryCard
          title="Completed"
          value={status === 'ready' ? summary.completed : '—'}
          description="Successfully completed"
        />
      </div>

      <div className="ao-secondary-summary">
        <span>
          Cancelled orders: <strong>{status === 'ready' ? summary.cancelled : '—'}</strong>
        </span>
        <span>
          Displaying actual order records only
        </span>
      </div>

      <section className="ap-catalog-panel">
        <div className="ap-catalog-header">
          <div>
            <h2>All orders</h2>
            <p>Search, filter, and review customer orders.</p>
          </div>

          <span className="ap-result-count">
            {status === 'ready' ? filteredOrders.length : '—'} orders
          </span>
        </div>

        <div className="ap-toolbar">
          <label className="ap-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => updateFilter(setSearch, event.target.value)}
              placeholder="Search order ID or customer..."
              aria-label="Search orders"
              disabled={status !== 'ready'}
            />
          </label>

          <label className="ap-filter">
            <span>Order status</span>
            <select
              value={orderStatus}
              onChange={(event) => updateFilter(setOrderStatus, event.target.value)}
              disabled={status !== 'ready'}
            >
              <option value="all">All statuses</option>
              {ORDER_STATUSES.map((item) => (
                <option key={item} value={item}>{label(item)}</option>
              ))}
            </select>
          </label>

          <label className="ap-filter">
            <span>Payment status</span>
            <select
              value={paymentStatus}
              onChange={(event) => updateFilter(setPaymentStatus, event.target.value)}
              disabled={status !== 'ready'}
            >
              <option value="all">All payments</option>
              {PAYMENT_STATUSES.map((item) => (
                <option key={item} value={item}>{label(item)}</option>
              ))}
            </select>
          </label>

          <label className="ap-filter">
            <span>Sort by</span>
            <select
              value={sort}
              onChange={(event) => updateFilter(setSort, event.target.value)}
              disabled={status !== 'ready'}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>

          <button
            type="button"
            className="ao-clear-button"
            onClick={clearFilters}
            disabled={status !== 'ready'}
          >
            Clear filters
          </button>
        </div>

        {status === 'loading' ? (
          <div className="ap-state" role="status">
            <span className="ap-loader" />
            <p>Loading orders...</p>
          </div>
        ) : status === 'unavailable' ? (
          <div className="ap-state">
            <span className="ap-empty-icon">▤</span>
            <strong>Waiting for the admin orders API</strong>
            <p>
              The orders interface is prepared. Once the protected backend
              endpoint is implemented, actual orders will appear here.
            </p>
          </div>
        ) : status === 'error' ? (
          <div className="ap-state ap-state-error">
            <strong>Unable to display orders</strong>
            <p>{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="ap-state">
            <span className="ap-empty-icon">▤</span>
            <strong>No orders yet</strong>
            <p>Customer orders will appear here when they are placed.</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="ap-state">
            <span className="ap-empty-icon">⌕</span>
            <strong>No matching orders</strong>
            <p>Try changing your search or filters.</p>
            <button type="button" className="ap-secondary-button" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <AdminDataTable
              className="ao-desktop-table"
              tableClassName="ao-table"
              columns={orderColumns}
              data={pageOrders}
              getRowKey={(order) => order.id}
              renderRow={renderOrderRow}
            />

            <div className="ao-mobile-list">
              {pageOrders.map((order) => (
                <article className="ao-mobile-order" key={order.id}>
                  <div className="ao-mobile-order-heading">
                    <strong>{order.orderCode || 'Order'}</strong>
                    <span>{dateTime(order.createdAt)}</span>
                  </div>
                  <strong>{order.customerFullName || 'Unknown customer'}</strong>
                  <span>{order.customerEmail || '—'}</span>
                  <div className="ao-mobile-facts">
                    <span>{getItemCount(order)} items</span>
                    <strong>{money(getOrderTotal(order))}</strong>
                  </div>
                  <div className="ao-mobile-badges">
                    <StatusBadge value={order.paymentStatus} />
                    <StatusBadge value={order.orderStatus} />
                  </div>
                  <button
                    type="button"
                    className="ao-view-button"
                    onClick={() => setSelectedOrder(order)}
                  >
                    View order details
                  </button>
                </article>
              ))}
            </div>

            <div className="ap-pagination">
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filteredOrders.length)} of{' '}
                {filteredOrders.length} orders
              </span>
              <div>
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Previous
                </button>
                <strong>{currentPage} / {totalPages}</strong>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </section>
  );
}

function DetailRow({ title, children }) {
  return (
    <div className="ao-detail-row">
      <span>{title}</span>
      <strong>{children ?? '—'}</strong>
    </div>
  );
}

function OrderDetails({ order, onClose }) {
  const address = [
    order.streetAddress,
    order.barangay,
    order.cityMunicipality,
    order.province,
    order.postalCode,
  ].filter(Boolean).join(', ');

  return (
    <AdminModal
      isOpen
      onClose={onClose}
      title={order.orderCode || 'Order details'}
      subtitle={`Placed ${dateTime(order.createdAt)}`}
      size="md"
      dialogClassName="ao-modal"
      footer={
        <button type="button" className="ap-secondary-button" onClick={onClose}>
          Close
        </button>
      }
    >
        <div className="ao-detail-content">
          <section className="ao-detail-section">
            <h3>Order status</h3>
            <div className="ao-status-overview">
              <div>
                <span>Order</span>
                <StatusBadge value={order.orderStatus} />
              </div>
              <div>
                <span>Payment</span>
                <StatusBadge value={order.paymentStatus} />
              </div>
            </div>
          </section>

          <section className="ao-detail-section">
            <h3>Customer information</h3>
            <DetailRow title="Full name">{order.customerFullName}</DetailRow>
            <DetailRow title="Email">{order.customerEmail}</DetailRow>
            <DetailRow title="Mobile">{order.mobileNumber}</DetailRow>
          </section>

          <section className="ao-detail-section">
            <h3>Delivery information</h3>
            <DetailRow title="Address">{address}</DetailRow>
            <DetailRow title="Delivery notes">{order.deliveryNotes}</DetailRow>
          </section>

          <section className="ao-detail-section">
            <h3>Ordered products</h3>
            {(order.items || []).length === 0 ? (
              <p className="ao-muted">No item details were returned.</p>
            ) : (
              <div className="ao-items-list">
                {order.items.map((item, index) => (
                  <article className="ao-item" key={`${item.productId}-${index}`}>
                    <div>
                      <strong>{item.productName}</strong>
                      <span>
                        {item.size ? `Size ${item.size} · ` : ''}
                        {label(item.fulfillmentStatus)} · Qty {item.quantity}
                      </span>
                    </div>
                    <strong>{money(item.lineTotal)}</strong>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="ao-detail-section">
            <h3>Payment breakdown</h3>
            <DetailRow title="Ready subtotal">{money(order.readySubtotal)}</DetailRow>
            <DetailRow title="Pre-order subtotal">{money(order.preorderSubtotal)}</DetailRow>
            <DetailRow title="Deposit">{Number(order.depositPercent || 0)}%</DetailRow>
            <DetailRow title="Deposit amount">{money(order.depositAmount)}</DetailRow>
            <DetailRow title="Due today">{money(order.dueToday)}</DetailRow>
            <DetailRow title="Remaining balance">{money(order.balanceLater)}</DetailRow>
            <div className="ao-total-row">
              <span>Order subtotal</span>
              <strong>{money(getOrderTotal(order))}</strong>
            </div>
          </section>

          <section className="ao-detail-section">
            <h3>Payment submissions</h3>
            {(order.payments || []).length === 0 ? (
              <p className="ao-muted">No payment submissions recorded.</p>
            ) : (
              order.payments.map((payment) => (
                <article className="ao-payment" key={payment.id}>
                  <div>
                    <strong>{label(payment.paymentPurpose)}</strong>
                    <span>{label(payment.paymentMethod)} · {dateTime(payment.submittedAt)}</span>
                    <span>Reference: {payment.referenceNumber || '—'}</span>
                    {payment.rejectionReason && (
                      <span className="ao-rejection">{payment.rejectionReason}</span>
                    )}
                  </div>
                  <div>
                    <strong>{money(payment.amount)}</strong>
                    <StatusBadge value={payment.status} />
                  </div>
                </article>
              ))
            )}
          </section>

          <section className="ao-detail-section">
            <h3>Order status history</h3>
            {(order.events || []).length === 0 ? (
              <p className="ao-muted">No status history available.</p>
            ) : (
              <ol className="ao-timeline">
                {order.events.map((event) => (
                  <li key={event.id}>
                    <span className="ao-timeline-dot" />
                    <div>
                      <strong>{label(event.newStatus)}</strong>
                      <p>
                        {event.previousStatus
                          ? `${label(event.previousStatus)} → ${label(event.newStatus)}`
                          : 'Initial order status'}
                      </p>
                      {event.note && <p>{event.note}</p>}
                      <small>
                        {dateTime(event.createdAt)} · {event.changedBy || 'System'}
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <p className="ao-detail-footnote">
            This view is read-only. Order actions, payment verification, and
            shipment management require separate authorized backend operations.
          </p>
        </div>
    </AdminModal>
  );
}
