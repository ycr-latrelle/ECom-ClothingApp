import { formatPeso } from '../../data/products.js';
import { formatDateTime, statusKey } from '../../utils/orders.js';
import OrderStatusBadge from './OrderStatusBadge.jsx';
import PaymentProofForm from './PaymentProofForm.jsx';

export default function PaymentInfo({ order, user, onSubmitted }) {
  const payment = order.payment;
  const key = statusKey(order.paymentStatus);
  const needsFirstProof = key === 'awaiting_submission';
  const wasRejected = key === 'rejected';

  return (
    <section className="orders-block" aria-labelledby="order-payment-title">
      <h3 id="order-payment-title">Payment</h3>

      <p className="orders-current">
        <span>Verification status</span>
        <OrderStatusBadge kind="payment" status={order.paymentStatus} />
      </p>

      {payment && (
        <dl className="orders-details">
          {payment.method && <div><dt>Payment method</dt><dd>{payment.method}</dd></div>}
          {payment.sourceProvider && <div><dt>Sent from</dt><dd>{payment.sourceProvider}</dd></div>}
          {payment.amount !== undefined && (
            <div><dt>Amount</dt><dd>{formatPeso(payment.amount)}</dd></div>
          )}
          {payment.referenceNumber && (
            <div><dt>Reference number</dt><dd className="orders-mono">{payment.referenceNumber}</dd></div>
          )}
          {payment.submittedAt && (
            <div><dt>Submitted</dt><dd>{formatDateTime(payment.submittedAt, { time: true })}</dd></div>
          )}
        </dl>
      )}

      {!payment && !needsFirstProof && (
        <p className="orders-muted">Payment details aren’t available for this order yet.</p>
      )}

      {wasRejected && (
        <p className="orders-banner is-error" role="alert">
          Your payment couldn’t be verified.
          {payment?.rejectionReason ? <> Reason: {payment.rejectionReason}</> : null}
        </p>
      )}

      {(needsFirstProof || wasRejected) && (
        <PaymentProofForm
          user={user}
          orderId={order.id}
          resubmitting={wasRejected}
          onSubmitted={onSubmitted}
        />
      )}
    </section>
  );
}
