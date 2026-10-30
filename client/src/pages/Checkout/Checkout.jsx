import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createOrder } from '../../api/orderApi.js';
import DeliveryLocationPicker from '../../components/DeliveryLocationPicker/DeliveryLocationPicker.jsx';
import { useAuth } from '../../context/useAuth.js';
import { useCart } from '../../context/useCart.js';
import { formatPeso } from '../../data/products.js';
import './Checkout.css';

const ORDER_SUMMARY_KEY = 'thread-theory-order-summary';

function totalFor(items) {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const directItem = location.state?.directItem;

  const { selectedItems, depositPercent, removeItem } = useCart();
  const { user, profile } = useAuth();

  const fullName = profile
    ? `${profile.firstName} ${profile.lastName}`
    : (user?.displayName ?? '');

  const address = profile?.address;
  const items = directItem ? [directItem] : selectedItems;

  const [deliveryPin, setDeliveryPin] = useState(null);
  const [pinError, setPinError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const readyItems = items.filter((item) => item.status !== 'pre-order');
  const preorderItems = items.filter((item) => item.status === 'pre-order');

  const readySubtotal = totalFor(readyItems);
  const preorderSubtotal = totalFor(preorderItems);
  const deposit = Math.round((preorderSubtotal * depositPercent) / 100);
  const dueToday = readySubtotal + deposit;
  const balanceLater = preorderSubtotal - deposit;

  async function handleSubmit(event) {
    event.preventDefault();

    if (!deliveryPin) {
      setPinError('Select or confirm a delivery pin on the map before continuing.');
      document
        .querySelector('.delivery-location-picker')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const value = (name) => String(formData.get(name) ?? '').trim();

    const orderRequest = {
      customerFullName: value('fullName'),
      customerEmail: value('email'),
      mobileNumber: value('phone'),
      streetAddress: value('street'),
      barangay: value('barangay'),
      cityMunicipality: value('city'),
      province: value('province'),
      postalCode: value('postalCode'),
      deliveryNotes: value('deliveryNotes') || null,
      deliveryLatitude: deliveryPin.latitude,
      deliveryLongitude: deliveryPin.longitude,
      deliveryAccuracyMeters: deliveryPin.accuracyMeters ?? null,
      items: items.map((item) => ({
        productId: item.id,
        quantity: Number(item.qty),
        size: item.size || null,
      })),
    };

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const result = await createOrder(user, orderRequest);

      const orderSummary = {
        id: result.id,
        orderCode: result.orderCode,
        orderStatus: result.orderStatus,
        paymentStatus: result.paymentStatus,
        isTest: result.isTest !== false,
        createdAt: result.createdAt,
        items: items.map(({ id, name, price, image, size, qty }) => ({
          id,
          name,
          price,
          image,
          size,
          qty,
        })),
        totals: {
          dueToday: result.dueToday,
          balanceLater: result.balanceLater,
        },
      };

      try {
        sessionStorage.setItem(
          ORDER_SUMMARY_KEY,
          JSON.stringify(orderSummary),
        );
      } catch {
        // The confirmation screen can still use router state.
      }

      if (!directItem) {
        items.forEach((item) => removeItem(item.key));
      }

      navigate(`/order-confirmation/${result.id}`, {
        state: { order: orderSummary },
      });
    } catch (error) {
      setSubmitError(
        error.message || 'Could not create the order. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <main className="checkout-page checkout-empty">
        <p className="eyebrow">Checkout</p>
        <h1>No items selected</h1>
        <p>Add an item to your cart before checking out.</p>
        <Link className="checkout-button" to="/shop">
          Back to shop
        </Link>
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
        <strong>Payment verification</strong>
        <span>
          After placing the order, you can submit the payment details and
          receipt. Payment stays pending until the store verifies the
          transaction.
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
                  defaultValue={fullName}
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
                <input
                  name="street"
                  autoComplete="address-line1"
                  defaultValue={address?.street ?? ''}
                  required
                />
              </label>

              <label className="checkout-field">
                Barangay
                <input
                  name="barangay"
                  autoComplete="address-line2"
                  defaultValue={address?.barangay ?? ''}
                  required
                />
              </label>

              <label className="checkout-field">
                City or municipality
                <input
                  name="city"
                  autoComplete="address-level2"
                  defaultValue={address?.city ?? ''}
                  required
                />
              </label>

              <label className="checkout-field">
                Province
                <input
                  name="province"
                  autoComplete="address-level1"
                  defaultValue={address?.province ?? ''}
                  required
                />
              </label>

              <label className="checkout-field">
                Postal code
                <input
                  name="postalCode"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  defaultValue={address?.postalCode ?? ''}
                  required
                />
              </label>

              <label className="checkout-field checkout-field-wide">
                Delivery notes{' '}
                <span className="checkout-optional">(optional)</span>
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
            <h2>Payment submission</h2>
            <p className="checkout-help">
              You’ll submit your payment details and receipt on the next screen.
              Payment remains pending until the store verifies the transaction.
            </p>
          </section>

          {submitError && (
            <p className="checkout-error" role="alert">
              {submitError}
            </p>
          )}

          <button
            className="checkout-button checkout-submit"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Saving order…'
              : `Create order · ${formatPeso(dueToday)} due today`}
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
            Shipping is not included yet. Delivery fees will be confirmed
            separately.
          </p>

          <Link className="checkout-back-link" to="/shop">
            Continue shopping
          </Link>
        </aside>
      </div>
    </main>
  );
}