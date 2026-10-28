import { Link, useLocation, useParams } from 'react-router-dom';
import { formatPeso } from '../../data/products.js';
import './OrderConfirmation.css';

const PREVIEW_ORDER_KEY = 'thread-theory-checkout-preview';

function readSavedOrder(orderId) {
  try {
    const order = JSON.parse(sessionStorage.getItem(PREVIEW_ORDER_KEY));
    return order?.id === orderId ? order : null;
  } catch {
    return null;
  }
}

export default function OrderConfirmation() {
  const { orderId } = useParams();
  const location = useLocation();

  const order =
    location.state?.order?.id === orderId
      ? location.state.order
      : readSavedOrder(orderId);

  if (!order) {
    return (
      <main className="confirmation-page">
        <p className="eyebrow">Checkout preview</p>
        <h1>Preview order not found</h1>
        <p>This order summary may have expired from this browser session.</p>
        <Link className="confirmation-button" to="/shop">Return to shop</Link>
      </main>
    );
  }

  return (
    <main className="confirmation-page">
      <div className="confirmation-mark" aria-hidden="true">✓</div>
      <p className="eyebrow">Checkout preview</p>
      <h1>Your preview order is ready</h1>

      <div className="confirmation-notice" role="status">
        This is a frontend preview. No order, payment reference, customer details,
        or proof image was sent to the store.
      </div>

      <section className="confirmation-card">
        <p className="confirmation-reference">Preview reference</p>
        <h2>{order.id}</h2>

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
            <dt>Selected payment method</dt>
            <dd>{order.paymentMethod}</dd>
          </div>
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

      <div className="confirmation-actions">
        <Link className="confirmation-button" to="/shop">Continue shopping</Link>
        <Link className="confirmation-link" to="/">Back to home</Link>
      </div>
    </main>
  );
}