
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/useAuth.js';
import {
  fetchAdminPayments,
  fetchAdminPaymentReceipt,
  verifyAdminPayment,
  rejectAdminPayment,
} from '../../api/adminPaymentApi.js';
import AdminDataTable from '../../components/Admin/AdminDataTable.jsx';
import AdminModal from '../../components/Admin/AdminModal.jsx';
import './AdminPayments.css';

const PAGE_SIZE = 8;

const PAYMENT_STATUSES = [
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
  const { user } = useAuth();

  const [payments, setPayments] = useState([]);
  const [loadStatus, setLoadStatus] = useState('loading');
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const [selectedPayment, setSelectedPayment] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptStatus, setReceiptStatus] = useState('idle');
  const [receiptError, setReceiptError] = useState('');

  const [actionStatus, setActionStatus] = useState('idle');
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const reload = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!user) {
      setLoadStatus('error');
      setError('You must be signed in to view administrative payments.');
      return undefined;
    }

    let active = true;

    setLoadStatus('loading');
    setError('');

    fetchAdminPayments(user)
      .then((data) => {
        if (!active) return;

        setPayments(data);
        setLoadStatus('ready');
      })
      .catch((requestError) => {
        if (!active) return;

        setPayments([]);
        setLoadStatus('error');
        setError(
          requestError.message || 'Could not load payment submissions.',
        );
      });

    return () => {
      active = false;
    };
  }, [user, reloadKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    return () => {
      if (receiptUrl) {
        URL.revokeObjectURL(receiptUrl);
      }
    };
  }, [receiptUrl]);

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
        payment.sourceProvider,
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
  const paymentColumns = [
    { key: 'order', label: 'Order' },
    { key: 'customer', label: 'Customer' },
    { key: 'method', label: 'Payment method' },
    { key: 'reference', label: 'Reference number' },
    { key: 'amount', label: 'Amount' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'status', label: 'Status' },
    { key: 'action', label: 'Action' },
  ];

  const renderPaymentRow = (payment) => (
    <>
      <td><strong className="apm-order-code">{payment.orderCode || '—'}</strong></td>
      <td>
        <div className="apm-customer">
          <strong>{payment.customerName || 'Unknown customer'}</strong>
          <small>{payment.customerEmail || '—'}</small>
        </div>
      </td>
      <td>
        <div className="apm-method-cell">
          <strong>{label(payment.paymentMethod)}</strong>
          {payment.sourceProvider && <small>{label(payment.sourceProvider)}</small>}
        </div>
      </td>
      <td><span className="apm-reference">{payment.referenceNumber || '—'}</span></td>
      <td><strong className="apm-amount">{money(payment.amount)}</strong></td>
      <td>{dateTime(payment.submittedAt)}</td>
      <td><PaymentStatusBadge value={payment.status} /></td>
      <td>
        <button
          type="button"
          className="apm-view-button"
          onClick={() => openDetails(payment)}
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
    setPaymentStatus('all');
    setPaymentMethod('all');
    setSort('newest');
    setPage(1);
  }

  function closeDetails() {
    setSelectedPayment(null);
    setRejectMode(false);
    setRejectionReason('');
    setActionError('');
    setActionStatus('idle');
    setReceiptStatus('idle');
    setReceiptError('');
    setReceiptUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return '';
    });
  }

  async function openDetails(payment) {
    closeDetails();
    setSelectedPayment(payment);

    if (!payment.hasReceipt) {
      setReceiptStatus('missing');
      return;
    }

    setReceiptStatus('loading');

    try {
      const blob = await fetchAdminPaymentReceipt(user, payment.id);

      if (!blob.type.startsWith('image/')) {
        throw new Error('The receipt response is not a supported image.');
      }

      const objectUrl = URL.createObjectURL(blob);

      setReceiptUrl(objectUrl);
      setReceiptStatus('ready');
    } catch (requestError) {
      setReceiptStatus('error');
      setReceiptError(
        requestError.message || 'Unable to load the receipt image.',
      );
    }
  }

  async function handleVerify() {
    if (!selectedPayment || actionStatus === 'loading') return;

    const confirmed = window.confirm(
      `Verify the payment for order ${selectedPayment.orderCode}?`,
    );

    if (!confirmed) return;

    setActionStatus('loading');
    setActionError('');

    try {
      await verifyAdminPayment(user, selectedPayment.id);

      closeDetails();
      reload();
    } catch (requestError) {
      setActionStatus('error');
      setActionError(
        requestError.message || 'Unable to verify this payment.',
      );
    }
  }

  async function handleReject(event) {
    event.preventDefault();

    if (!selectedPayment || actionStatus === 'loading') return;

    const reason = rejectionReason.trim();

    if (!reason) {
      setActionError('Please provide a rejection reason.');
      return;
    }

    setActionStatus('loading');
    setActionError('');

    try {
      await rejectAdminPayment(
        user,
        selectedPayment.id,
        reason,
      );

      closeDetails();
      reload();
    } catch (requestError) {
      setActionStatus('error');
      setActionError(
        requestError.message || 'Unable to reject this payment.',
      );
    }
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
          onClick={reload}
          disabled={loadStatus === 'loading'}
        >
          ↻ Refresh payments
        </button>
      </header>

      {loadStatus === 'error' && (
        <div className="apm-preview-notice apm-error-notice" role="alert">
          <span className="apm-notice-icon">!</span>
          <p>
            <strong>Payments could not be loaded.</strong>{' '}
            {error}
            {' '}
            <button type="button" onClick={reload}>Try again</button>
          </p>
        </div>
      )}

      <div className="ap-summary-grid">
        <SummaryCard
          title="Total submissions"
          value={loadStatus === 'ready' ? summary.total : '—'}
          description="All recorded payment submissions"
        />
        <SummaryCard
          title="Pending verification"
          value={loadStatus === 'ready' ? summary.pending : '—'}
          description="Waiting for administrator review"
        />
        <SummaryCard
          title="Verified"
          value={loadStatus === 'ready' ? summary.verified : '—'}
          description="Successfully verified submissions"
        />
        <SummaryCard
          title="Rejected"
          value={loadStatus === 'ready' ? summary.rejected : '—'}
          description="Rejected payment submissions"
        />
      </div>

      <div className="apm-secondary-summary">
        <span>
          {loadStatus === 'ready'
            ? `${summary.pending} payment submissions require review.`
            : 'Payment submission information'}
        </span>
        <span>
          <strong>
            {loadStatus === 'ready'
              ? 'Live administrative records'
              : 'Waiting for API'}
          </strong>
        </span>
      </div>

      <section className="ap-catalog-panel">
        <div className="ap-catalog-header">
          <div>
            <h2>Payment submissions</h2>
            <p>Search, filter, and review customer payment records.</p>
          </div>

          <span className="ap-result-count">
            {loadStatus === 'ready' ? filteredPayments.length : '—'} submissions
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
              disabled={loadStatus !== 'ready'}
            />
          </label>

          <label className="ap-filter">
            <span>Payment status</span>
            <select
              value={paymentStatus}
              onChange={(event) =>
                updateFilter(setPaymentStatus, event.target.value)
              }
              disabled={loadStatus !== 'ready'}
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
              disabled={loadStatus !== 'ready'}
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
              disabled={loadStatus !== 'ready'}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>

          <button
            type="button"
            className="apm-clear-button"
            onClick={clearFilters}
            disabled={loadStatus !== 'ready'}
          >
            Clear filters
          </button>
        </div>

        {loadStatus === 'loading' ? (
          <div className="ap-state" role="status">
            <span className="ap-loader" />
            <p>Loading payment submissions...</p>
          </div>
        ) : loadStatus === 'error' ? (
          <div className="ap-state ap-state-error">
            <strong>Unable to display payments</strong>
            <p>{error}</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="ap-state apm-empty-state">
            <span className="apm-empty-icon">₱</span>
            <strong>No payment records available</strong>
            <p>
              Customer payment submissions will appear here once
              they are recorded.
            </p>
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
            <AdminDataTable
              tableClassName="apm-table"
              columns={paymentColumns}
              data={pagePayments}
              getRowKey={(payment) => payment.id}
              renderRow={renderPaymentRow}
            />

            <div className="ap-pagination">
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filteredPayments.length)} of{' '}
                {filteredPayments.length} submissions
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

      {selectedPayment && (
        <PaymentDetails
          payment={selectedPayment}
          receiptUrl={receiptUrl}
          receiptStatus={receiptStatus}
          receiptError={receiptError}
          actionStatus={actionStatus}
          actionError={actionError}
          rejectMode={rejectMode}
          rejectionReason={rejectionReason}
          onRejectionReasonChange={setRejectionReason}
          onVerify={handleVerify}
          onReject={handleReject}
          onStartReject={() => {
            setRejectMode(true);
            setActionError('');
          }}
          onCancelReject={() => {
            setRejectMode(false);
            setRejectionReason('');
            setActionError('');
          }}
          onClose={closeDetails}
        />
      )}
    </section>
  );
}

function DetailRow({ title, children }) {
  return (
    <div className="apm-detail-row">
      <span>{title}</span>
      <strong>{children ?? '—'}</strong>
    </div>
  );
}

function PaymentDetails({
  payment,
  receiptUrl,
  receiptStatus,
  receiptError,
  actionStatus,
  actionError,
  rejectMode,
  rejectionReason,
  onRejectionReasonChange,
  onVerify,
  onReject,
  onStartReject,
  onCancelReject,
  onClose,
}) {
  const isPending = payment.status === 'pending_verification';

  return (
    <AdminModal
      isOpen
      onClose={onClose}
      eyebrow="PAYMENT REVIEW"
      title={payment.orderCode || 'Payment details'}
      subtitle={`Submitted ${dateTime(payment.submittedAt)}`}
      size="md"
      dialogClassName="apm-modal"
      backdropClassName="apm-payment-modal-backdrop"
      isBusy={actionStatus === 'loading'}
      footer={!rejectMode && (
        <>
          <button
            type="button"
            className="apm-cancel-button"
            onClick={onClose}
            disabled={actionStatus === 'loading'}
          >
            Close
          </button>

          {isPending && (
            <>
              <button
                type="button"
                className="apm-reject-button"
                onClick={onStartReject}
                disabled={actionStatus === 'loading'}
              >
                Reject payment
              </button>
              <button
                type="button"
                className="apm-verify-button"
                onClick={onVerify}
                disabled={actionStatus === 'loading'}
              >
                {actionStatus === 'loading'
                  ? 'Processing...'
                  : 'Verify payment'}
              </button>
            </>
          )}
        </>
      )}
    >
          <section className="apm-detail-section">
            <div className="apm-detail-status">
              <span>Verification status</span>
              <PaymentStatusBadge value={payment.status} />
            </div>
            <DetailRow title="Payment purpose">
              {label(payment.paymentPurpose)}
            </DetailRow>
            <DetailRow title="Amount">{money(payment.amount)}</DetailRow>
            <DetailRow title="Payment method">
              {label(payment.paymentMethod)}
            </DetailRow>
            <DetailRow title="Payment provider">
              {payment.sourceProvider
                ? label(payment.sourceProvider)
                : '—'}
            </DetailRow>
            <DetailRow title="Destination account">
              {payment.destinationId}
            </DetailRow>
          </section>

          <section className="apm-detail-section">
            <h3>Customer payment information</h3>
            <DetailRow title="Customer">{payment.customerName}</DetailRow>
            <DetailRow title="Email">{payment.customerEmail}</DetailRow>
            <DetailRow title="Sender name">{payment.senderName}</DetailRow>
            <DetailRow title="Reference number">
              {payment.referenceNumber}
            </DetailRow>
          </section>

          <section className="apm-detail-section">
            <h3>Submitted receipt</h3>

            {receiptStatus === 'loading' ? (
              <div className="apm-receipt-state">
                <span className="ap-loader" />
                <p>Loading receipt image...</p>
              </div>
            ) : receiptStatus === 'ready' && receiptUrl ? (
              <a
                className="apm-receipt-link"
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
              >
                <img
                  className="apm-receipt-image"
                  src={receiptUrl}
                  alt={`Payment receipt for ${payment.orderCode}`}
                />
                <span>Open full-size receipt</span>
              </a>
            ) : receiptStatus === 'missing' ? (
              <p className="apm-receipt-message">
                No receipt image is attached to this submission.
              </p>
            ) : (
              <p className="apm-receipt-error">
                {receiptError || 'Unable to load the receipt.'}
              </p>
            )}

            <DetailRow title="Receipt validation">
              {label(payment.receiptValidationStatus)}
            </DetailRow>
            <DetailRow title="Receipt file size">
              {payment.receiptSizeBytes == null
                ? '—'
                : `${(payment.receiptSizeBytes / 1024).toFixed(1)} KB`}
            </DetailRow>
          </section>

          {(payment.status === 'rejected' || payment.adminNote) && (
            <section className="apm-detail-section">
              <h3>Administrator note</h3>
              <p className="apm-admin-note">
                {payment.adminNote || 'No administrator note.'}
              </p>
            </section>
          )}

          {payment.verifiedAt && (
            <section className="apm-detail-section">
              <h3>Verification information</h3>
              <DetailRow title="Verified at">
                {dateTime(payment.verifiedAt)}
              </DetailRow>
              <DetailRow title="Verified by">
                {payment.verifiedBy}
              </DetailRow>
            </section>
          )}

          {actionError && (
            <div className="apm-action-error" role="alert">
              {actionError}
            </div>
          )}

          {rejectMode && (
            <form className="apm-rejection-form" onSubmit={onReject}>
              <label htmlFor="apm-rejection-reason">
                Rejection reason
              </label>
              <textarea
                id="apm-rejection-reason"
                value={rejectionReason}
                onChange={(event) =>
                  onRejectionReasonChange(event.target.value)
                }
                placeholder="Explain why this payment submission is being rejected..."
                rows={4}
                maxLength={1000}
                required
                disabled={actionStatus === 'loading'}
              />
              <small>
                The customer will be able to submit a corrected receipt.
              </small>

              <div className="apm-modal-actions">
                <button
                  type="button"
                  className="apm-cancel-button"
                  onClick={onCancelReject}
                  disabled={actionStatus === 'loading'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="apm-reject-button"
                  disabled={
                    actionStatus === 'loading' ||
                    !rejectionReason.trim()
                  }
                >
                  {actionStatus === 'loading'
                    ? 'Processing...'
                    : 'Confirm rejection'}
                </button>
              </div>
            </form>
          )}
    </AdminModal>
  );
}
