
import { useMemo, useState } from 'react';
import './AdminPayments.css';

const PAGE_SIZE = 8;

const PAYMENT_STATUSES = [
  'awaiting_submission',
  'pending_verification',
  'verified',
  'rejected',
];

const PAYMENT_METHODS = [
  'all',
  'gcash',
  'maya',
  'bank_transfer',
];

const money = (value) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const label = (value) =>
  String(value || 'Unknown')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());

function PaymentStatusBadge({ value }) {
  const normalized = String(value || 'unknown')
    .toLowerCase()
    .replaceAll('_', '-');

  return (
    <span className={`apm-status apm-status-${normalized}`}>
      {label(value)}
    </span>
  );
}

function SummaryCard({ title, value, description }) {
  return (
    <article className="apm-summary-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{description}</small>
    </article>
  );
}

export default function AdminPayments() {
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  // Payment records will be supplied by the protected admin API
  // in a later implementation stage. No sample records are used here.
  const payments = [];

  const summary = useMemo(() => ({
    total: payments.length,
    pending: payments.filter(
      (payment) => payment.status === 'pending_verification',
    ).length,
    verified: payments.filter(
      (payment) => payment.status === 'verified',
    ).length,
    rejected: payments.filter(
      (payment) => payment.status === 'rejected',
    ).length,
  }), [payments]);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = payments.filter((payment) => {
      const matchesSearch = !query || [
        payment.orderCode,
        payment.customerName,
        payment.customerEmail,
        payment.referenceNumber,
        payment.senderName,
      ].some((value) =>
        String(value || '').toLowerCase().includes(query),
      );

      const matchesStatus =
        paymentStatus === 'all' || payment.status === paymentStatus;

      const matchesMethod =
        paymentMethod === 'all' ||
        String(payment.paymentMethod || '').toLowerCase() === paymentMethod;

      return matchesSearch && matchesStatus && matchesMethod;
    });

    return filtered.sort((a, b) => {
      const first = new Date(a.submittedAt || 0).getTime();
      const second = new Date(b.submittedAt || 0).getTime();

      return sort === 'oldest' ? first - second : second - first;
    });
  }, [payments, search, paymentStatus, paymentMethod, sort]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPayments.length / PAGE_SIZE),
  );

  const currentPage = Math.min(page, totalPages);

  const pagePayments = filteredPayments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function updateFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  function clearFilters() {
    setSearch('');
    setPaymentStatus('all');
    setPaymentMethod('all');
    setSort('newest');
    setPage(1);
  }

  return (
    <section className="admin-payments">
      <header className="admin-products-heading">
        <div>
          <p className="eyebrow">STORE MANAGEMENT</p>
          <h1>Payments</h1>
          <p className="admin-page-description">
            Review customer payment submissions and receipt verification.
          </p>
        </div>

        <button
          type="button"
          className="ap-secondary-button"
          disabled
          title="Available after backend integration"
        >
          Refresh payments
        </button>
      </header>

      <div className="apm-preview-notice">
        <span className="apm-notice-icon">i</span>
        <p>
          <strong>Payment API not connected yet.</strong>{' '}
          This screen is currently a frontend preview. Actual payment
          submissions, receipt images, and verification actions will
          become available after backend integration.
        </p>
      </div>

      <div className="ap-summary-grid">
        <SummaryCard
          title="Total submissions"
          value="—"
          description="All recorded payment submissions"
        />
        <SummaryCard
          title="Pending verification"
          value="—"
          description="Waiting for administrator review"
        />
        <SummaryCard
          title="Verified"
          value="—"
          description="Successfully verified submissions"
        />
        <SummaryCard
          title="Rejected"
          value="—"
          description="Rejected payment submissions"
        />
      </div>

      <div className="apm-secondary-summary">
        <span>
          Payment records will appear here after API integration.
        </span>
        <span>
          <strong>Verification actions disabled</strong>
        </span>
      </div>

      <section className="ap-catalog-panel">
        <div className="ap-catalog-header">
          <div>
            <h2>Payment submissions</h2>
            <p>
              Search and review customer payment records.
            </p>
          </div>

          <span className="ap-result-count">
            {filteredPayments.length} submissions
          </span>
        </div>

        <div className="ap-toolbar apm-toolbar">
          <label className="ap-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) =>
                updateFilter(setSearch, event.target.value)
              }
              placeholder="Search order, customer, or reference..."
              aria-label="Search payment submissions"
            />
          </label>

          <label className="ap-filter">
            <span>Payment status</span>
            <select
              value={paymentStatus}
              onChange={(event) =>
                updateFilter(setPaymentStatus, event.target.value)
              }
            >
              <option value="all">All statuses</option>
              {PAYMENT_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {label(item)}
                </option>
              ))}
            </select>
          </label>

          <label className="ap-filter">
            <span>Payment method</span>
            <select
              value={paymentMethod}
              onChange={(event) =>
                updateFilter(setPaymentMethod, event.target.value)
              }
            >
              {PAYMENT_METHODS.map((item) => (
                <option key={item} value={item}>
                  {item === 'all' ? 'All methods' : label(item)}
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
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>

          <button
            type="button"
            className="apm-clear-button"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>

        {payments.length === 0 ? (
          <div className="ap-state apm-empty-state">
            <span className="apm-empty-icon">₱</span>
            <strong>No payment records available</strong>
            <p>
              Payment submissions will appear here once the
              protected admin payments API is connected.
            </p>
            <span className="apm-empty-hint">
              No sample or placeholder transactions are being displayed.
            </span>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="ap-state">
            <span className="apm-empty-icon">⌕</span>
            <strong>No matching payments</strong>
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
              <table className="ap-product-table apm-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Payment method</th>
                    <th>Reference number</th>
                    <th>Amount</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {pagePayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        <strong className="apm-order-code">
                          {payment.orderCode || '—'}
                        </strong>
                      </td>
                      <td>
                        <div className="apm-customer">
                          <strong>
                            {payment.customerName || 'Unknown customer'}
                          </strong>
                          <small>{payment.customerEmail || '—'}</small>
                        </div>
                      </td>
                      <td>{label(payment.paymentMethod)}</td>
                      <td>
                        <span className="apm-reference">
                          {payment.referenceNumber || '—'}
                        </span>
                      </td>
                      <td>
                        <strong className="apm-amount">
                          {money(payment.amount)}
                        </strong>
                      </td>
                      <td>{payment.submittedAt || '—'}</td>
                      <td>
                        <PaymentStatusBadge value={payment.status} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="apm-view-button"
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
                Showing {pagePayments.length} of {filteredPayments.length} submissions
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

      <section className="apm-workflow-note">
        <div>
          <strong>Payment review workflow</strong>
          <p>
            The planned workflow will let administrators inspect
            submitted receipts, verify payment details, or reject
            submissions with an explanation.
          </p>
        </div>
        <span>Backend integration pending</span>
      </section>
    </section>
  );
}
