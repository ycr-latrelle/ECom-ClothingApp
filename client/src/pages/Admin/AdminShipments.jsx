
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/useAuth.js';
import {
  fetchAdminShipments,
  fetchAdminShipmentDetails,
  updateAdminShipment,
  updateAdminShippingFee,
} from '../../api/adminShipmentApi.js';
import './AdminProducts.css';
import './AdminShipments.css';

const PAGE_SIZE = 8;

const COURIERS = [
  { value: 'gogo_express', label: 'Gogo Express' },
  { value: 'jnt', label: 'J&T Express' },
  { value: 'lbc', label: 'LBC' },
];

const SHIPMENT_STATUSES = [
  'not_shipped',
  'ready_for_pickup',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'delivery_failed',
  'returned',
  'cancelled',
];

const label = (value) =>
  String(value || 'Unknown')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());

const money = (value) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const dateTime = (value) => {
  if (!value) return '—';

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

function ShipmentStatusBadge({ value }) {
  const normalized = String(value || 'unknown')
    .toLowerCase()
    .replaceAll('_', '-');

  return (
    <span className={`ash-status ash-status-${normalized}`}>
      {label(value)}
    </span>
  );
}

function SummaryCard({ title, value, description }) {
  return (
    <article className="ash-summary-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{description}</small>
    </article>
  );
}

function courierLabel(value) {
  return COURIERS.find((item) => item.value === value)?.label || label(value);
}

function toDateInput(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function AdminShipments() {
  const { user } = useAuth();

  const [shipments, setShipments] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState('');
  const [shipmentStatus, setShipmentStatus] = useState('all');
  const [courier, setCourier] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const [selectedOrderId, setSelectedOrderId] = useState(null);

  useEffect(() => {
    if (!user) {
      setStatus('error');
      setError('You must be signed in to view shipments.');
      return undefined;
    }

    let cancelled = false;

    setStatus('loading');
    setError('');

    fetchAdminShipments(user)
      .then((records) => {
        if (cancelled) return;
        setShipments(records);
        setStatus('ready');
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(requestError.message || 'Could not load shipments.');
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  const summary = useMemo(() => ({
    total: shipments.length,
    notShipped: shipments.filter(
      (item) => item.shipmentStatus === 'not_shipped',
    ).length,
    inTransit: shipments.filter(
      (item) => ['in_transit', 'out_for_delivery'].includes(item.shipmentStatus),
    ).length,
    delivered: shipments.filter(
      (item) => item.shipmentStatus === 'delivered',
    ).length,
  }), [shipments]);

  const filteredShipments = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = shipments.filter((shipment) => {
      const matchesSearch = !query || [
        shipment.orderCode,
        shipment.customerName,
        shipment.customerEmail,
        shipment.trackingNumber,
        shipment.mobileNumber,
      ].some((value) => String(value || '').toLowerCase().includes(query));

      const matchesStatus =
        shipmentStatus === 'all' ||
        shipment.shipmentStatus === shipmentStatus;

      const matchesCourier =
        courier === 'all' || shipment.courier === courier;

      return matchesSearch && matchesStatus && matchesCourier;
    });

    return filtered.sort((a, b) => {
      const first = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const second = new Date(b.updatedAt || b.createdAt || 0).getTime();

      return sort === 'oldest' ? first - second : second - first;
    });
  }, [shipments, search, shipmentStatus, courier, sort]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredShipments.length / PAGE_SIZE),
  );

  const currentPage = Math.min(page, totalPages);

  const pageShipments = filteredShipments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function updateFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  function clearFilters() {
    setSearch('');
    setShipmentStatus('all');
    setCourier('all');
    setSort('newest');
    setPage(1);
  }

  function reload() {
    setSelectedOrderId(null);
    setReloadKey((value) => value + 1);
  }

  return (
    <section className="admin-shipments">
      <header className="admin-products-heading">
        <div>
          <p className="eyebrow">STORE MANAGEMENT</p>
          <h1>Shipments</h1>
          <p className="admin-page-description">
            Manage order dispatch, courier information, and delivery tracking.
          </p>
        </div>

        <button
          type="button"
          className="ap-secondary-button"
          onClick={reload}
          disabled={status === 'loading'}
        >
          ↻ Refresh shipments
        </button>
      </header>

      {status === 'error' && (
        <div className="ap-preview-notice" role="alert">
          <span className="ap-notice-icon">!</span>
          <p>
            <strong>Shipments could not be loaded.</strong> {error}{' '}
            <button type="button" onClick={reload}>Try again</button>
          </p>
        </div>
      )}

      <div className="ap-summary-grid ash-summary-grid">
        <SummaryCard
          title="Total orders"
          value={status === 'ready' ? summary.total : '—'}
          description="Orders with or without shipment records"
        />
        <SummaryCard
          title="Not shipped"
          value={status === 'ready' ? summary.notShipped : '—'}
          description="Awaiting courier dispatch"
        />
        <SummaryCard
          title="In transit"
          value={status === 'ready' ? summary.inTransit : '—'}
          description="In transit or out for delivery"
        />
        <SummaryCard
          title="Delivered"
          value={status === 'ready' ? summary.delivered : '—'}
          description="Successfully completed deliveries"
        />
      </div>

      <section className="ap-catalog-panel ash-catalog-panel">
        <div className="ap-catalog-header">
          <div>
            <h2>Shipment records</h2>
            <p>Search orders and review courier and delivery information.</p>
          </div>

          <span className="ap-result-count">
            {status === 'ready' ? filteredShipments.length : '—'} records
          </span>
        </div>

        <div className="ap-toolbar ash-toolbar">
          <label className="ap-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => updateFilter(setSearch, event.target.value)}
              placeholder="Search order, customer, or tracking number..."
              aria-label="Search shipments"
              disabled={status !== 'ready'}
            />
          </label>

          <label className="ap-filter">
            <span>Shipment status</span>
            <select
              value={shipmentStatus}
              onChange={(event) =>
                updateFilter(setShipmentStatus, event.target.value)
              }
              disabled={status !== 'ready'}
            >
              <option value="all">All statuses</option>
              {SHIPMENT_STATUSES.map((item) => (
                <option key={item} value={item}>{label(item)}</option>
              ))}
            </select>
          </label>

          <label className="ap-filter">
            <span>Courier</span>
            <select
              value={courier}
              onChange={(event) => updateFilter(setCourier, event.target.value)}
              disabled={status !== 'ready'}
            >
              <option value="all">All couriers</option>
              {COURIERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
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
              <option value="newest">Recently updated</option>
              <option value="oldest">Least recently updated</option>
            </select>
          </label>

          <button
            type="button"
            className="ash-clear-button"
            onClick={clearFilters}
            disabled={status !== 'ready'}
          >
            Clear filters
          </button>
        </div>

        {status === 'loading' ? (
          <div className="ap-state" role="status">
            <span className="ap-loader" />
            <p>Loading shipments...</p>
          </div>
        ) : status === 'error' ? (
          <div className="ap-state ap-state-error">
            <strong>Unable to display shipments</strong>
            <p>{error}</p>
          </div>
        ) : shipments.length === 0 ? (
          <div className="ap-state">
            <span className="ash-empty-icon">◇</span>
            <strong>No orders available</strong>
            <p>Orders will appear here when customers place them.</p>
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="ap-state">
            <strong>No matching shipments</strong>
            <p>Try changing your search or filters.</p>
            <button
              type="button"
              className="ap-secondary-button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="ap-table-wrap">
              <table className="ap-product-table ash-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Courier</th>
                    <th>Tracking number</th>
                    <th>Shipping fee</th>
                    <th>Last updated</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {pageShipments.map((shipment) => (
                    <tr key={shipment.orderId}>
                      <td>
                        <strong className="ash-order-code">
                          {shipment.orderCode}
                        </strong>
                      </td>
                      <td>
                        <div className="ash-customer">
                          <strong>{shipment.customerName}</strong>
                          <small>{shipment.customerEmail}</small>
                        </div>
                      </td>
                      <td>{shipment.courier ? courierLabel(shipment.courier) : 'Not assigned'}</td>
                      <td>
                        <span className="ash-tracking-number">
                          {shipment.trackingNumber || 'Not assigned'}
                        </span>
                      </td>
                      <td>
                        <strong className="ash-shipping-fee">
                          {shipment.shippingFee == null
                            ? 'To be confirmed'
                            : money(shipment.shippingFee)}
                        </strong>
                        <small className="ash-fee-status">
                          {label(shipment.shippingFeeStatus)}
                        </small>
                      </td>
                      <td>{dateTime(shipment.updatedAt || shipment.createdAt)}</td>
                      <td>
                        <ShipmentStatusBadge value={shipment.shipmentStatus} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="ash-view-button"
                          onClick={() => setSelectedOrderId(shipment.orderId)}
                        >
                          View details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ap-pagination">
              <span>
                Showing {pageShipments.length} of {filteredShipments.length} orders
              </span>

              <div>
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage <= 1}
                >
                  Previous
                </button>
                <strong>{currentPage} / {totalPages}</strong>
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {selectedOrderId && (
        <ShipmentDetails
          user={user}
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onSaved={reload}
        />
      )}
    </section>
  );
}

function DetailRow({ title, children }) {
  return (
    <div className="ash-detail-row">
      <span>{title}</span>
      <strong>{children || '—'}</strong>
    </div>
  );
}

function ShipmentDetails({ user, orderId, onClose, onSaved }) {
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [shipmentStatus, setShipmentStatus] = useState('not_shipped');
  const [estimatedDeliveryAt, setEstimatedDeliveryAt] = useState('');
  const [note, setNote] = useState('');

  const [shippingFee, setShippingFee] = useState('');
  const [shippingFeeStatus, setShippingFeeStatus] = useState('to_be_confirmed');

  useEffect(() => {
    let cancelled = false;

    fetchAdminShipmentDetails(user, orderId)
      .then((data) => {
        if (cancelled) return;

        setShipment(data);
        setCourier(data.courier || '');
        setTrackingNumber(data.trackingNumber || '');
        setTrackingUrl(data.trackingUrl || '');
        setShipmentStatus(data.shipmentStatus || 'not_shipped');
        setEstimatedDeliveryAt(toDateInput(data.estimatedDeliveryAt));
        setShippingFee(data.shippingFee == null ? '' : String(data.shippingFee));
        setShippingFeeStatus(data.shippingFeeStatus || 'to_be_confirmed');
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message || 'Could not load shipment details.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, orderId]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !saving) onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, saving]);

  const address = shipment
    ? [
        shipment.streetAddress,
        shipment.barangay,
        shipment.cityMunicipality,
        shipment.province,
        shipment.postalCode,
      ].filter(Boolean).join(', ')
    : '';

  async function saveShipment(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateAdminShipment(user, orderId, {
        courier: courier || null,
        trackingNumber: trackingNumber.trim() || null,
        trackingUrl: trackingUrl.trim() || null,
        shipmentStatus,
        estimatedDeliveryAt: estimatedDeliveryAt
          ? new Date(estimatedDeliveryAt).toISOString()
          : null,
        note: note.trim() || null,
      });

      setSuccess('Shipment information saved.');
      setNote('');

      const updated = await fetchAdminShipmentDetails(user, orderId);
      setShipment(updated);
      setCourier(updated.courier || '');
      setTrackingNumber(updated.trackingNumber || '');
      setTrackingUrl(updated.trackingUrl || '');
      setShipmentStatus(updated.shipmentStatus || 'not_shipped');
      setEstimatedDeliveryAt(toDateInput(updated.estimatedDeliveryAt));

      onSaved();
    } catch (requestError) {
      setError(requestError.message || 'Could not save shipment information.');
    } finally {
      setSaving(false);
    }
  }

  async function saveShippingFee(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const amount = shippingFee === '' ? null : Number(shippingFee);

      if (
        shippingFeeStatus === 'confirmed' &&
        (amount === null || !Number.isFinite(amount) || amount < 0)
      ) {
        throw new Error('Enter a valid shipping fee before confirming it.');
      }

      await updateAdminShippingFee(user, orderId, {
        shippingFee: amount,
        shippingFeeStatus,
      });

      setSuccess('Shipping fee updated.');
      onSaved();

      const updated = await fetchAdminShipmentDetails(user, orderId);
      setShipment(updated);
      setShippingFee(updated.shippingFee == null ? '' : String(updated.shippingFee));
      setShippingFeeStatus(updated.shippingFeeStatus || 'to_be_confirmed');
    } catch (requestError) {
      setError(requestError.message || 'Could not update shipping fee.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="ap-modal-backdrop ash-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        className="ap-modal ash-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ash-detail-title"
      >
        <header className="ap-modal-header">
          <div>
            <p className="eyebrow">SHIPMENT MANAGEMENT</p>
            <h2 id="ash-detail-title">
              {shipment?.orderCode || 'Shipment details'}
            </h2>
            <p>Review delivery information and manage shipment details.</p>
          </div>

          <button
            type="button"
            className="ap-modal-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close shipment details"
          >
            ×
          </button>
        </header>

        <div className="ash-detail-content">
          {loading ? (
            <div className="ap-state">
              <span className="ap-loader" />
              <p>Loading shipment details...</p>
            </div>
          ) : !shipment ? (
            <div className="ap-state ap-state-error">
              <strong>Shipment details unavailable</strong>
              <p>{error || 'The requested order could not be found.'}</p>
            </div>
          ) : (
            <>
              {error && <p className="ash-form-error" role="alert">{error}</p>}
              {success && <p className="ash-form-success" role="status">{success}</p>}

              <section className="ash-detail-section">
                <h3>Customer and delivery information</h3>
                <DetailRow title="Customer">{shipment.customerName}</DetailRow>
                <DetailRow title="Email">{shipment.customerEmail}</DetailRow>
                <DetailRow title="Mobile">{shipment.mobileNumber}</DetailRow>
                <DetailRow title="Delivery address">{address}</DetailRow>
                <DetailRow title="Delivery notes">{shipment.deliveryNotes}</DetailRow>
                <DetailRow title="Coordinates">
                  {shipment.deliveryLatitude}, {shipment.deliveryLongitude}
                </DetailRow>
                <DetailRow title="Location accuracy">
                  {shipment.deliveryAccuracyMeters == null
                    ? '—'
                    : `${shipment.deliveryAccuracyMeters} meters`}
                </DetailRow>
                <DetailRow title="Receiver">{shipment.customerName}</DetailRow>
                <DetailRow title="Sender">Not available in current shipment schema</DetailRow>
              </section>

              <form className="ash-edit-form" onSubmit={saveShipment}>
                <section className="ash-detail-section">
                  <h3>Courier and tracking</h3>

                  <label>
                    <span>Courier</span>
                    <select value={courier} onChange={(event) => setCourier(event.target.value)}>
                      <option value="">Not assigned</option>
                      {COURIERS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Tracking number</span>
                    <input
                      value={trackingNumber}
                      onChange={(event) => setTrackingNumber(event.target.value)}
                      placeholder="Enter tracking number"
                    />
                  </label>

                  <label>
                    <span>Tracking URL</span>
                    <input
                      type="url"
                      value={trackingUrl}
                      onChange={(event) => setTrackingUrl(event.target.value)}
                      placeholder="https://..."
                    />
                  </label>

                  <label>
                    <span>Shipment status</span>
                    <select
                      value={shipmentStatus}
                      onChange={(event) => setShipmentStatus(event.target.value)}
                    >
                      {SHIPMENT_STATUSES.map((item) => (
                        <option key={item} value={item}>{label(item)}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Estimated delivery</span>
                    <input
                      type="datetime-local"
                      value={estimatedDeliveryAt}
                      onChange={(event) => setEstimatedDeliveryAt(event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Status update note</span>
                    <textarea
                      rows="3"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Optional note for the shipment history"
                    />
                  </label>

                  <button className="ap-primary-button" type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save shipment information'}
                  </button>
                </section>
              </form>

              <form className="ash-edit-form" onSubmit={saveShippingFee}>
                <section className="ash-detail-section">
                  <h3>Shipping fee</h3>

                  <label>
                    <span>Fee status</span>
                    <select
                      value={shippingFeeStatus}
                      onChange={(event) => setShippingFeeStatus(event.target.value)}
                    >
                      <option value="to_be_confirmed">To be confirmed</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="waived">Waived</option>
                    </select>
                  </label>

                  <label>
                    <span>Shipping fee (PHP)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={shippingFee}
                      onChange={(event) => setShippingFee(event.target.value)}
                      disabled={shippingFeeStatus !== 'confirmed'}
                      placeholder="Enter shipping fee"
                    />
                  </label>

                  <button className="ap-primary-button" type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Update shipping fee'}
                  </button>
                </section>
              </form>

              <section className="ash-detail-section">
                <h3>Shipment timeline</h3>

                {!shipment.shipmentId ? (
                  <p className="ash-muted">
                    No shipment record has been created yet. Saving shipment
                    information will create the initial record.
                  </p>
                ) : shipment.history.length === 0 ? (
                  <p className="ash-muted">No status history has been recorded.</p>
                ) : (
                  <ol className="ash-timeline">
                    {shipment.history.map((event) => (
                      <li key={event.id}>
                        <span className="ash-timeline-dot" />
                        <div>
                          <strong>{label(event.newStatus)}</strong>
                          <p>
                            {event.previousStatus
                              ? `${label(event.previousStatus)} → ${label(event.newStatus)}`
                              : 'Initial shipment status'}
                          </p>
                          {event.note && <p>{event.note}</p>}
                          <small>
                            {dateTime(event.createdAt)} · {event.changedBy}
                          </small>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <p className="ash-detail-footnote">
                Shipping fee changes update the order record. They do not
                automatically recalculate payment amounts in this version.
              </p>
            </>
          )}
        </div>

        <footer className="ap-modal-footer">
          <button
            type="button"
            className="ap-secondary-button"
            onClick={onClose}
            disabled={saving}
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}
