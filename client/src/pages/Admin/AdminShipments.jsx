
import { useMemo, useState } from 'react';
import './AdminShipments.css';

const PAGE_SIZE = 8;

const COURIERS = [
  { value: 'all', label: 'All couriers' },
  { value: 'gogo_express', label: 'Gogo Express' },
  { value: 'jnt', label: 'J&T Express' },
  { value: 'lbc', label: 'LBC' },
];

const SHIPMENT_STATUSES = [
  'awaiting_dispatch',
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
  const courier = COURIERS.find((item) => item.value === value);
  return courier ? courier.label : label(value);
}

export default function AdminShipments() {
  const [search, setSearch] = useState('');
  const [shipmentStatus, setShipmentStatus] = useState('all');
  const [courier, setCourier] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  // Shipment records will be supplied by the protected admin API
  // in a later implementation stage. No sample records are used here.
  const shipments = [];

  const filteredShipments = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = shipments.filter((shipment) => {
      const matchesSearch = !query || [
        shipment.orderCode,
        shipment.customerName,
        shipment.customerEmail,
        shipment.trackingNumber,
        shipment.receiverName,
        shipment.senderName,
      ].some((value) =>
        String(value || '').toLowerCase().includes(query),
      );

      const matchesStatus =
        shipmentStatus === 'all' ||
        shipment.status === shipmentStatus;

      const matchesCourier =
        courier === 'all' ||
        String(shipment.courier || '').toLowerCase() === courier;

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
          disabled
          title="Available after backend integration"
        >
          Refresh shipments
        </button>
      </header>

      <div className="ash-preview-notice">
        <span className="ash-notice-icon">i</span>
        <p>
          <strong>Shipment API not connected yet.</strong>{' '}
          This screen is currently a frontend preview. Shipment records,
          courier tracking information, delivery locations, and management
          actions will become available after backend integration.
        </p>
      </div>

      <div className="ap-summary-grid ash-summary-grid">
        <SummaryCard
          title="Total shipments"
          value="—"
          description="All recorded shipments"
        />
        <SummaryCard
          title="Awaiting dispatch"
          value="—"
          description="Orders not yet handed to courier"
        />
        <SummaryCard
          title="In transit"
          value="—"
          description="Shipments currently being delivered"
        />
        <SummaryCard
          title="Delivered"
          value="—"
          description="Successfully completed deliveries"
        />
      </div>

      <div className="ash-secondary-summary">
        <span>
          Shipment records will appear here after API integration.
        </span>
        <span>
          <strong>Shipment management disabled</strong>
        </span>
      </div>

      <section className="ap-catalog-panel ash-catalog-panel">
        <div className="ap-catalog-header">
          <div>
            <h2>Shipment records</h2>
            <p>
              Search orders and review courier and delivery information.
            </p>
          </div>

          <span className="ap-result-count">
            {filteredShipments.length} shipments
          </span>
        </div>

        <div className="ap-toolbar ash-toolbar">
          <label className="ap-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) =>
                updateFilter(setSearch, event.target.value)
              }
              placeholder="Search order, customer, or tracking number..."
              aria-label="Search shipments"
            />
          </label>

          <label className="ap-filter">
            <span>Shipment status</span>
            <select
              value={shipmentStatus}
              onChange={(event) =>
                updateFilter(setShipmentStatus, event.target.value)
              }
            >
              <option value="all">All statuses</option>
              {SHIPMENT_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {label(item)}
                </option>
              ))}
            </select>
          </label>

          <label className="ap-filter">
            <span>Courier</span>
            <select
              value={courier}
              onChange={(event) =>
                updateFilter(setCourier, event.target.value)
              }
            >
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
              onChange={(event) =>
                updateFilter(setSort, event.target.value)
              }
            >
              <option value="newest">Recently updated</option>
              <option value="oldest">Least recently updated</option>
            </select>
          </label>

          <button
            type="button"
            className="ash-clear-button"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>

        {shipments.length === 0 ? (
          <div className="ap-state ash-empty-state">
            <span className="ash-empty-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" />
                <path d="m3.3 7.7 8.7 4.5 8.7-4.5M12 21v-8.8M7.5 5.3l9 4.6" />
              </svg>
            </span>

            <strong>No shipment records available</strong>
            <p>
              Shipment records will appear here once the protected
              admin shipments API is connected.
            </p>
            <span className="ash-empty-hint">
              No sample or placeholder shipments are being displayed.
            </span>
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="ap-state">
            <span className="ash-empty-icon" aria-hidden="true">⌕</span>
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
                    <tr key={shipment.id}>
                      <td>
                        <strong className="ash-order-code">
                          {shipment.orderCode || '—'}
                        </strong>
                      </td>

                      <td>
                        <div className="ash-customer">
                          <strong>
                            {shipment.customerName || 'Unknown customer'}
                          </strong>
                          <small>{shipment.customerEmail || '—'}</small>
                        </div>
                      </td>

                      <td>{courierLabel(shipment.courier)}</td>

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
                      </td>

                      <td>
                        {shipment.updatedAt
                          ? new Date(shipment.updatedAt).toLocaleString()
                          : '—'}
                      </td>

                      <td>
                        <ShipmentStatusBadge value={shipment.status} />
                      </td>

                      <td>
                        <button
                          type="button"
                          className="ash-view-button"
                          disabled
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
                Showing {pageShipments.length} of {filteredShipments.length} shipments
              </span>

              <div>
                <button
                  type="button"
                  onClick={() =>
                    setPage((value) => Math.max(1, value - 1))
                  }
                  disabled={currentPage <= 1}
                >
                  Previous
                </button>

                <strong>
                  {currentPage} / {totalPages}
                </strong>

                <button
                  type="button"
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                  disabled={currentPage >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="ash-workflow-panel">
        <div className="ash-workflow-heading">
          <div>
            <strong>Shipment management workflow</strong>
            <p>
              The planned shipment details view will centralize courier,
              tracking, recipient, sender, delivery address, and shipment
              history information.
            </p>
          </div>

          <span>Backend integration pending</span>
        </div>

        <div className="ash-workflow-grid">
          <article>
            <span className="ash-workflow-number">01</span>
            <div>
              <strong>Delivery information</strong>
              <p>Customer address, contact details, and map coordinates.</p>
            </div>
          </article>

          <article>
            <span className="ash-workflow-number">02</span>
            <div>
              <strong>Courier and tracking</strong>
              <p>Courier selection, tracking number, and dispatch details.</p>
            </div>
          </article>

          <article>
            <span className="ash-workflow-number">03</span>
            <div>
              <strong>Shipment history</strong>
              <p>Shipment status changes and recorded delivery events.</p>
            </div>
          </article>
        </div>
      </section>
    </section>
  );
}
