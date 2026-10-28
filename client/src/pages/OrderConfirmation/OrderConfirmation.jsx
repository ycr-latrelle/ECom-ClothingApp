import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { submitPaymentProof } from '../../api/paymentApi.js';
import { useAuth } from '../../context/useAuth.js';
import { formatPeso } from '../../data/products.js';
import './OrderConfirmation.css';

const ORDER_SUMMARY_KEY = 'thread-theory-order-summary';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];

function readSavedOrder(orderId) {
  try {
    const order = JSON.parse(sessionStorage.getItem(ORDER_SUMMARY_KEY));
    return order?.id === orderId ? order : null;
  } catch {
    return null;
  }
}

function formatStatus(status = '') {
  return status
    .replace(/_/g, ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

export default function OrderConfirmation() {
  const { orderId } = useParams();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const routeOrder =
    location.state?.order?.id === orderId ? location.state.order : null;
  const order = readSavedOrder(orderId) ?? routeOrder;

  const [paymentMethod, setPaymentMethod] = useState('GCash');
  const [senderName, setSenderName] = useState('');
  const [paymentReferenceNumber, setPaymentReferenceNumber] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [imageError, setImageError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedPaymentStatus, setSubmittedPaymentStatus] = useState(null);

  if (!order) {
    return (
      <main className="confirmation-page">
        <p className="eyebrow">Order</p>
        <h1>Order summary unavailable</h1>
        <p>
          This summary is no longer available in this browser session. Your
          order record may still be saved.
        </p>
        <Link className="confirmation-button" to="/shop">
          Return to shop
        </Link>
      </main>
    );
  }

  const paymentStatus = submittedPaymentStatus ?? order.paymentStatus;

  function handleImageChange(event) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setProofImage(null);
      setImageError('');
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      event.target.value = '';
      setProofImage(null);
      setImageError('Choose a JPEG or PNG receipt image.');
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      event.target.value = '';
      setProofImage(null);
      setImageError('Choose an image that is 5 MB or smaller.');
      return;
    }

    setProofImage(file);
    setImageError('');
  }

  async function handlePaymentSubmit(event) {
    event.preventDefault();

    if (!proofImage) {
      setImageError('Choose a receipt image before submitting.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const result = await submitPaymentProof(user, order.id, {
        paymentMethod,
        senderName: senderName.trim(),
        paymentReferenceNumber: paymentReferenceNumber.trim(),
        proofImage,
      });

      const updatedOrder = {
        ...order,
        paymentStatus: result.paymentStatus,
      };

      try {
        sessionStorage.setItem(
          ORDER_SUMMARY_KEY,
          JSON.stringify(updatedOrder),
        );
      } catch {
        // The status will still show for the current page.
      }

      setSubmittedPaymentStatus(result.paymentStatus);
    } catch (error) {
      setSubmitError(
        error.message || 'Could not submit payment proof. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="confirmation-page">
      <div className="confirmation-mark" aria-hidden="true">✓</div>
      <p className="eyebrow">Order saved</p>
      <h1>Your test order is saved</h1>

      <div className="confirmation-notice" role="status">
        This order is marked as test data. Use a test receipt while checking
        the Telegram upload flow.
      </div>

      <section className="confirmation-card">
        <p className="confirmation-reference">Order code</p>
        <h2>{order.orderCode}</h2>

        <dl className="confirmation-totals">
          <div>
            <dt>Order status</dt>
            <dd>{formatStatus(order.orderStatus)}</dd>
          </div>
          <div>
            <dt>Payment status</dt>
            <dd>{formatStatus(paymentStatus)}</dd>
          </div>
        </dl>

        <ul className="confirmation-items">
          {order.items.map((item) => (
            <li key={`${item.id}-${item.size ?? 'one-size'}`}>
              <span>
                {item.name}
                {item.size && ` · Size ${item.size}`}
                {` × ${item.qty}`}
              </span>
              <strong>{formatPeso(item.price * item.qty)}</strong>
            </li>
          ))}
        </ul>

        <dl className="confirmation-totals">
          <div>
            <dt>Due today</dt>
            <dd>{formatPeso(order.totals.dueToday)}</dd>
          </div>

          {order.totals.balanceLater > 0 && (
            <div>
              <dt>Pre-order balance on arrival</dt>
              <dd>{formatPeso(order.totals.balanceLater)}</dd>
            </div>
          )}
        </dl>
      </section>

      {paymentStatus === 'awaiting_submission' && (
        <section className="confirmation-payment-card">
          <p className="eyebrow">Payment</p>
          <h2>Submit your payment proof</h2>
          <p>
            Amount due now: <strong>{formatPeso(order.totals.dueToday)}</strong>
          </p>

          <div className="confirmation-qr-placeholder">
            <strong>{paymentMethod} QR payment</strong>
            <span>
              Add the official store QR image before accepting live payments.
              For this test order, use a test receipt and do not send money.
            </span>
          </div>

          {authLoading ? (
            <p>Checking your account…</p>
          ) : !user ? (
            <p role="alert">
              Sign in again to submit payment proof.{' '}
              <Link to="/account" state={{ from: location }}>
                Go to sign in
              </Link>
            </p>
          ) : (
            <form
              className="confirmation-payment-form"
              onSubmit={handlePaymentSubmit}
            >
              <label>
                Payment method
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                >
                  <option value="GCash">GCash</option>
                  <option value="Maya">Maya</option>
                </select>
              </label>

              <label>
                Sender name
                <input
                  type="text"
                  value={senderName}
                  onChange={(event) => setSenderName(event.target.value)}
                  maxLength={200}
                  required
                />
              </label>

              <label>
                Payment reference number
                <input
                  type="text"
                  value={paymentReferenceNumber}
                  onChange={(event) =>
                    setPaymentReferenceNumber(event.target.value)
                  }
                  maxLength={120}
                  required
                />
              </label>

              <label>
                Receipt screenshot
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleImageChange}
                  required
                />
                <span className="confirmation-file-note">
                  JPEG or PNG, up to 5 MB.
                </span>
              </label>

              {proofImage && (
                <p className="confirmation-file-name">
                  Selected: {proofImage.name}
                </p>
              )}

              {imageError && (
                <p className="confirmation-error" role="alert">
                  {imageError}
                </p>
              )}

              {submitError && (
                <p className="confirmation-error" role="alert">
                  {submitError}
                </p>
              )}

              <button
                className="confirmation-button"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Sending receipt…'
                  : 'Submit payment proof'}
              </button>
            </form>
          )}
        </section>
      )}

      {paymentStatus === 'pending_verification' && (
        <div className="confirmation-notice" role="status">
          Your receipt was sent to the store for manual payment verification.
        </div>
      )}

      <div className="confirmation-actions">
        <Link className="confirmation-button" to="/shop">
          Continue shopping
        </Link>
        <Link className="confirmation-link" to="/">
          Back to home
        </Link>
      </div>
    </main>
  );
}