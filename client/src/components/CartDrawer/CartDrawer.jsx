import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/useCart.js';
import { MAX_QTY } from '../../context/cart-context.js';
import { formatPeso } from '../../data/products.js';
import './CartDrawer.css';

const FOCUSABLE = 'a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])';

function CartLine({ item }) {
  const { increase, decrease, removeItem, toggleItem } = useCart();
  const atMax = item.qty >= MAX_QTY;

  return (
    <li className={`cart-item ${item.selected ? '' : 'is-unselected'}`}>
      <input
        type="checkbox"
        className="cart-check"
        checked={item.selected}
        onChange={() => toggleItem(item.key)}
        aria-label={`Include ${item.name}${item.size ? `, size ${item.size}` : ''} in checkout`}
      />
      <img src={item.image} alt="" />

      <div className="cart-item-info">
        <h4>{item.name}</h4>
        {item.size && <p className="cart-item-size">Size {item.size}</p>}
        <p>{formatPeso(item.price)}</p>

        <div className="cart-qty">
          <button
            type="button"
            onClick={() => decrease(item.key)}
            aria-label={item.qty === 1 ? `Remove ${item.name}` : `Decrease quantity of ${item.name}`}
          >
            −
          </button>
          <span aria-live="polite">{item.qty}</span>
          <button
            type="button"
            onClick={() => increase(item.key)}
            disabled={atMax}
            aria-label={`Increase quantity of ${item.name}`}
          >
            +
          </button>
        </div>
        {atMax && <p className="cart-max">Maximum of {MAX_QTY} per item.</p>}
      </div>

      <button type="button" className="cart-remove" onClick={() => removeItem(item.key)}>
        Remove
      </button>
    </li>
  );
}

function CartSection({ title, note, items }) {
  if (items.length === 0) return null;

  return (
    <section className="cart-section">
      <div className="cart-section-heading">
        <h3>{title}</h3>
        {note && <span>{note}</span>}
      </div>
      <ul className="cart-list">
        {items.map((item) => (
          <CartLine key={item.key} item={item} />
        ))}
      </ul>
    </section>
  );
}

export default function CartDrawer() {
  const {
    items, readyItems, preorderItems, isOpen, closeCart, count,
    selectedCount, allSelected, setAllSelected, hasReadySelected, hasPreorderSelected,
    readySubtotal, preorderSubtotal, depositPercent, deposit, dueNow, balanceLater,
  } = useCart();
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const opener = document.activeElement;

    const onKey = (e) => {
      if (e.key === 'Escape') {
        closeCart();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      // keep Tab and Shift+Tab inside the open drawer
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
      opener?.focus?.(); // hand focus back to the button that opened the cart
    };
  }, [isOpen, closeCart]);

  const hasPreorder = hasPreorderSelected;
  const nothingSelected = selectedCount === 0;

  return (
    // `inert` keeps the closed drawer out of the tab order and screen readers
    <div className={`cart-drawer ${isOpen ? 'is-open' : ''}`} inert={!isOpen}>
      <div className="cart-overlay" onClick={closeCart} />

      <aside
        ref={panelRef}
        className="cart-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        <header className="cart-header">
          <h2>Your cart ({count})</h2>
          <button ref={closeRef} type="button" onClick={closeCart} aria-label="Close cart">✕</button>
        </header>

        {items.length === 0 ? (
          <div className="cart-empty">
            <p>Your cart is empty.</p>
            <Link className="cart-shop-link" to="/shop" onClick={closeCart}>
              Shop now <span aria-hidden="true">→</span>
            </Link>
          </div>
        ) : (
          <>
            <label className="cart-select-all">
              <input
                type="checkbox"
                className="cart-check"
                checked={allSelected}
                onChange={(e) => setAllSelected(e.target.checked)}
              />
              Select all items
            </label>

            <div className="cart-items">
              <CartSection title="Ready stock" items={readyItems} />
              <CartSection
                title="Pre-order"
                note={`${depositPercent}% deposit now`}
                items={preorderItems}
              />
            </div>

            <footer className="cart-footer">
              <dl className="cart-totals">
                {hasReadySelected && (
                  <div>
                    <dt>Ready stock</dt>
                    <dd>{formatPeso(readySubtotal)}</dd>
                  </div>
                )}
                {hasPreorder && (
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
                <div className="cart-due">
                  <dt>Due today</dt>
                  <dd>{formatPeso(dueNow)}</dd>
                </div>
                {hasPreorder && (
                  <div>
                    <dt>Pre-order balance, due on arrival</dt>
                    <dd>{formatPeso(balanceLater)}</dd>
                  </div>
                )}
              </dl>

              {nothingSelected && (
                <p className="cart-select-hint" role="status">
                  Tick at least one item to check out.
                </p>
              )}
              <p>
                {hasPreorder
                  ? 'The pre-order balance and delivery fee are paid once your item arrives. Shipping for ready stock is calculated at checkout.'
                  : 'Shipping is calculated at checkout.'}
              </p>
              {/* TODO: connect to your checkout page / payment flow */}
              <button type="button" className="button cart-checkout" disabled={nothingSelected}>
                Checkout ({selectedCount})
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
