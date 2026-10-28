import { useEffect, useRef, useState } from 'react';
import { useCart } from '../../context/useCart.js';
import { MAX_QTY } from '../../context/cart-context.js';
import { formatPeso, sizesFor } from '../../data/products.js';
import './QuickCheckout.css';

const FOCUSABLE = 'a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])';

function Panel({ item, mode }) {
  const { addItem, closeQuickCheckout, depositPercent } = useCart();
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState(null);
  const [needSize, setNeedSize] = useState(false);
  const sizes = sizesFor(item.category);
  const addMode = mode === 'cart';
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  const preorder = item.status === 'pre-order';
  const total = item.price * qty;
  const deposit = Math.round((total * depositPercent) / 100);
  const dueNow = preorder ? deposit : total;

  const pickSize = (value) => {
    setSize(value);
    setNeedSize(false);
  };

  const confirm = () => {
    if (sizes.length > 0 && !size) {
      setNeedSize(true);
      return;
    }

    if (addMode) {
      addItem({ id: item.id, name: item.name, price: item.price, image: item.image, status: item.status, size }, qty);
      closeQuickCheckout();
      return;
    }

    // TODO: connect to your checkout page / payment flow. Send `item`, `size` and `qty`.
  };

  useEffect(() => {
    const opener = document.activeElement;

    const onKey = (e) => {
      if (e.key === 'Escape') {
        closeQuickCheckout();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      // keep Tab and Shift+Tab inside the panel
      const focusable = [...panelRef.current.querySelectorAll(FOCUSABLE)];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      opener?.focus?.();
    };
  }, [closeQuickCheckout]);

  return (
    <div className="quick-checkout">
      <div className="quick-overlay" onClick={closeQuickCheckout} />

      <section
        ref={panelRef}
        className="quick-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-title"
      >
        <header className="quick-header">
          <h2 id="quick-title">{addMode ? 'Add to cart' : 'Check out'}</h2>
          <button ref={closeRef} type="button" onClick={closeQuickCheckout} aria-label="Close">✕</button>
        </header>

        <div className="quick-item">
          <img src={item.image} alt="" />
          <div>
            <h3>{item.name}</h3>
            <p>{formatPeso(item.price)}</p>
            {preorder && <span className="quick-tag">Pre-order</span>}

            <div className="quick-qty">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span aria-live="polite">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
                disabled={qty >= MAX_QTY}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            {qty >= MAX_QTY && <p className="quick-muted">Maximum of {MAX_QTY} per item.</p>}
          </div>
        </div>

        {sizes.length > 0 && (
          <fieldset className={`quick-sizes ${needSize ? 'is-missing' : ''}`}>
            <legend>Size</legend>
            <div>
              {sizes.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={size === value}
                  className={size === value ? 'is-active' : ''}
                  onClick={() => pickSize(value)}
                >
                  {value}
                </button>
              ))}
            </div>
            {needSize && <p role="alert">Select a size to continue.</p>}
          </fieldset>
        )}

        {addMode ? (
          <dl className="quick-totals">
            <div className="quick-due">
              <dt>Item total</dt>
              <dd>{formatPeso(total)}</dd>
            </div>
          </dl>
        ) : (
          <>
            <dl className="quick-totals">
              <div>
                <dt>{preorder ? 'Pre-order total' : 'Item total'}</dt>
                <dd>{formatPeso(total)}</dd>
              </div>
              {preorder && (
                <div>
                  <dt>Deposit ({depositPercent}%)</dt>
                  <dd>{formatPeso(deposit)}</dd>
                </div>
              )}
              <div className="quick-due">
                <dt>Due today</dt>
                <dd>{formatPeso(dueNow)}</dd>
              </div>
              {preorder && (
                <div>
                  <dt>Balance, due on arrival</dt>
                  <dd>{formatPeso(total - deposit)}</dd>
                </div>
              )}
            </dl>

            <p className="quick-note">
              {preorder
                ? 'The balance and delivery fee are paid once your item arrives.'
                : 'Shipping is calculated at checkout.'}
            </p>
          </>
        )}

        <button type="button" className="quick-confirm" onClick={confirm}>
          {addMode ? 'Add to cart' : 'Proceed to checkout'}
        </button>
      </section>
    </div>
  );
}

// The floating "buy this one item now" panel, opened by the Check out button on a product card.
export default function QuickCheckout() {
  const { quickItem } = useCart();
  return quickItem ? <Panel key={`${quickItem.id}::${quickItem.mode}`} item={quickItem} mode={quickItem.mode} /> : null;
}
