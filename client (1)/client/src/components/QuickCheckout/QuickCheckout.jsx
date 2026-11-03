import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthPanel } from '../../context/useAuthPanel.js';
import { useCart } from '../../context/useCart.js';
import { MAX_QTY } from '../../context/cart-context.js';
import { formatPeso } from '../../data/products.js';
import './QuickCheckout.css';

const FOCUSABLE = 'a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])';

function Panel({ item, mode }) {
  const { addItem, closeQuickCheckout, depositPercent } = useCart();
  const navigate = useNavigate();
  const { requireAuth } = useAuthPanel();

  const [qty, setQty] = useState(1);
  const [size, setSize] = useState(null);
  const [needSize, setNeedSize] = useState(false);

  const sizes = Array.isArray(item.sizes) ? item.sizes : [];
  const addMode = mode === 'cart';
  const preorder = item.status === 'pre-order';
  const total = item.price * qty;
  const deposit = Math.round((total * depositPercent) / 100);
  const dueNow = preorder ? deposit : total;

  const panelRef = useRef(null);
  const closeRef = useRef(null);

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
      addItem(
        {
          id: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          category: item.category,
          status: item.status,
          size,
        },
        qty,
      );

      closeQuickCheckout();
      return;
    }

    const key = size ? `${item.id}::${size}` : item.id;

    const directItem = {
      id: item.id,
      key,
      name: item.name,
      price: item.price,
      image: item.image,
      status: item.status,
      size,
      qty,
    };

    closeQuickCheckout();
    requireAuth(() => navigate('/checkout', { state: { directItem } }), {
      reason: 'Sign in or create an account to continue to checkout.',
    });
  };

  useEffect(() => {
    const opener = document.activeElement;

    const onKey = (event) => {
      if (event.key === 'Escape') {
        closeQuickCheckout();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = [...panelRef.current.querySelectorAll(FOCUSABLE)];
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
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
          <button
            ref={closeRef}
            type="button"
            onClick={closeQuickCheckout}
            aria-label="Close"
          >
            ✕
          </button>
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
                onClick={() => setQty((current) => Math.max(1, current - 1))}
                disabled={qty <= 1}
                aria-label="Decrease quantity"
              >
                −
              </button>

              <span aria-live="polite">{qty}</span>

              <button
                type="button"
                onClick={() => setQty((current) => Math.min(MAX_QTY, current + 1))}
                disabled={qty >= MAX_QTY}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            {qty >= MAX_QTY && (
              <p className="quick-muted">Maximum of {MAX_QTY} per item.</p>
            )}
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

export default function QuickCheckout() {
  const { quickItem } = useCart();

  return quickItem ? (
    <Panel
      key={`${quickItem.id}::${quickItem.mode}`}
      item={quickItem}
      mode={quickItem.mode}
    />
  ) : null;
}