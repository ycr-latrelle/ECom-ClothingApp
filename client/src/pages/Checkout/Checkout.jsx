import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import { useCart } from '../../context/useCart.js';
import { formatPeso } from '../../data/products.js';
import DeliveryLocationPicker from '../../components/DeliveryLocationPicker/DeliveryLocationPicker.jsx';
import './Checkout.css';

const PREVIEW_ORDER_KEY = 'thread-theory-checkout-preview';

function totalFor(items) {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const directItem = location.state?.directItem;

  const { selectedItems, depositPercent, removeItem } = useCart();
  const { user } = useAuth();

  const items = directItem ? [directItem] : selectedItems;

  const [paymentMethod, setPaymentMethod] = useState('GCash');
  const [proofName, setProofName] = useState('');
  const [proofError, setProofError] = useState('');
  const [deliveryPin, setDeliveryPin] = useState(null);
  const [pinError, setPinError] = useState('');

  const readyItems = items.filter((item) => item.status !== 'pre-order');
  const preorderItems = items.filter((item) => item.status === 'pre-order');

  const readySubtotal = totalFor(readyItems);
  const preorderSubtotal = totalFor(preorderItems);
  const deposit = Math.round((preorderSubtotal * depositPercent) / 100);
  const dueToday = readySubtotal + deposit;
  const balanceLater = preorderSubtotal - deposit;

  function handleProofChange(event) {
    const file = event.target.files?.[0];

    if (file && file.size > 5 * 1024 * 1024) {
      event.target.value = '';
      setProofName('');
      setProofError('Choose an image smaller than 5 MB.');
      return;
    }

    setProofName(file?.name ?? '');
    setProofError('');
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!deliveryPin) {
      setPinError('Select or confirm a delivery pin on the map before continuing.');
      document
        .querySelector('.delivery-location-picker')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const order = {
      id: `PREVIEW-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      paymentMethod,
      deliveryLocation: {
        latitude: deliveryPin.latitude,
        longitude: deliveryPin.longitude,
        accuracyMeters: deliveryPin.accuracyMeters,
        source: deliveryPin.source,
      },
      items: items.map(({ id, name, price, image, size, qty, status }) => ({
        id,
        name,
        price,
        image,
        size,
        qty,
        status,
      })),
      totals: {
        readySubtotal,
        preorderSubtotal,
        deposit,
        dueToday,
        balanceLater,
        depositPercent,
      },
    };

    // This is only a temporary browser preview; it does not send an order to the store.
    try {
      sessionStorage.setItem(PREVIEW_ORDER_KEY, JSON.stringify(order));
    } catch {
      // The confirmation screen can still use router state if storage is unavailable.
    }

    if (!directItem) {
      items.forEach((item) => removeItem(item.key));
    }

    navigate(`/order-confirmation/${order.id}`, { state: { order } });
  }

  if (items.length === 0) {
    return (
      <main className="checkout-page checkout-empty">
        <p className="eyebrow">Checkout</p>
        <h1>No items selected</h1>
        <p>Add an item to your cart, or select items in the cart before checking out.</p>
        <Link className="checkout-button" to="/shop">Back to shop</Link>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <header className="checkout-heading">
        <p className="eyebrow">Checkout</p>
        <h1>Complete your order</h1>
        <p>
          Signed in as {user?.email ?? 'your account'}. We’ve filled in your
          contact details; you can change them for this order.
        </p>
      </header>

      <div className="checkout-preview-notice" role="status">
        <strong>Checkout preview</strong>
        <span>
          This form does not send an order or payment. Your customer details and
          proof image are not saved. The pin is held only in this temporary browser
          preview.
        </span>
      </div>

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <section className="checkout-card">
            <p className="checkout-step">01</p>
            <h2>Contact information</h2>

            <div className="checkout-field-grid">
              <label className="checkout-field checkout-field-wide">
                Full name
                <input
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  defaultValue={user?.displayName ?? ''}
                  required
                />
              </label>

              <label className="checkout-field">
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={user?.email ?? ''}
                  required
                />
              </label>

              <label className="checkout-field">
                Mobile number
                <input name="phone" type="tel" autoComplete="tel" required />
              </label>
            </div>
          </section>

          <section className="checkout-card">
            <p className="checkout-step">02</p>
            <h2>Delivery address</h2>

            <div className="checkout-field-grid">
              <label className="checkout-field checkout-field-wide">
                Street address
                <input name="street" autoComplete="address-line1" required />
              </label>

              <label className="checkout-field">
                Barangay
                <input name="barangay" autoComplete="address-line2" />
              </label>

              <label className="checkout-field">
                City or municipality
                <input name="city" autoComplete="address-level2" required />
              </label>

              <label className="checkout-field">
                Province
                <input name="province" autoComplete="address-level1" required />
              </label>

              <label className="checkout-field">
                Postal code
                <input
                  name="postalCode"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  required
                />
              </label>

              <label className="checkout-field checkout-field-wide">
                Delivery notes <span className="checkout-optional">(optional)</span>
                <textarea name="deliveryNotes" rows="3" />
              </label>
            </div>

            <DeliveryLocationPicker
              value={deliveryPin}
              onChange={(pin) => {
                setDeliveryPin(pin);
                setPinError('');
              }}
              error={pinError}
            />
          </section>

          <section className="checkout-card">
            <p className="checkout-step">03</p>
            <h2>Payment details</h2>
            <p className="checkout-help">
              Choose the payment method you plan to use. The store’s official QR
              code will be added before this checkout is connected to real orders.
            </p>

            <div className="checkout-methods">
              {['GCash', 'Maya'].map((method) => (
                <label
                  key={method}
                  className={`checkout-method ${paymentMethod === method ? 'is-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method}
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethod(method)}
                  />
                  <span>{method}</span>
                </label>
              ))}
            </div>

            <div className="checkout-qr-placeholder">
              <strong>{paymentMethod} QR code</strong>
              <span>Official store QR image will appear here.</span>
            </div>

            <div className="checkout-field-grid">
              <label className="checkout-field">
                Sender name
                <input name="senderName" type="text" required />
              </label>

              <label className="checkout-field">
                Payment reference number
                <input name="paymentReference" type="text" required />
              </label>

              <label className="checkout-field checkout-field-wide">
                Proof of payment screenshot
                <input
                  name="paymentProof"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleProofChange}
                  required
                />
                <span className="checkout-file-note">
                  Image only, up to 5 MB. The preview will not upload this file.
                </span>
                {proofName && <span className="checkout-file-name">{proofName}</span>}
                {proofError && (
                  <span className="checkout-error" role="alert">{proofError}</span>
                )}
              </label>
            </div>
          </section>

          <button className="checkout-button checkout-submit" type="submit">
            Create preview order · {formatPeso(dueToday)} due today
          </button>
        </form>

        <aside className="checkout-summary">
          <h2>Order summary</h2>

          <ul className="checkout-items">
            {items.map((item) => (
              <li key={item.key ?? `${item.id}-${item.size ?? 'one-size'}`}>
                <img src={item.image} alt="" />

                <div>
                  <strong>{item.name}</strong>
                  {item.size && <span>Size {item.size}</span>}
                  <span>Qty {item.qty}</span>
                </div>

                <b>{formatPeso(item.price * item.qty)}</b>
              </li>
            ))}
          </ul>

          <dl className="checkout-totals">
            {readySubtotal > 0 && (
              <div>
                <dt>Ready-stock items</dt>
                <dd>{formatPeso(readySubtotal)}</dd>
              </div>
            )}

            {preorderSubtotal > 0 && (
              <>
                <div>
                  <dt>Pre-order total</dt>
                  <dd>{formatPeso(preorderSubtotal)}</dd>
                </div>
                <div>
                  <dt>Pre-order deposit ({depositPercent}%)</dt>
                  <dd>{formatPeso(deposit)}</dd>
                </div>
              </>
            )}

            <div className="checkout-total-due">
              <dt>Due today</dt>
              <dd>{formatPeso(dueToday)}</dd>
            </div>

            {balanceLater > 0 && (
              <div>
                <dt>Pre-order balance on arrival</dt>
                <dd>{formatPeso(balanceLater)}</dd>
              </div>
            )}
          </dl>

          <p className="checkout-shipping-note">
            Shipping is not included in this preview. Ready-stock delivery fees
            will be confirmed separately; pre-order delivery fees are due when the
            items arrive.
          </p>

          <Link className="checkout-back-link" to="/shop">Continue shopping</Link>
        </aside>
      </div>
    </main>
  );
}