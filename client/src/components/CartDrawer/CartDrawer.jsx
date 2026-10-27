import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/useCart.js';
import { formatPeso } from '../../data/products.js';
import './CartDrawer.css';

export default function CartDrawer() {
  const { items, isOpen, closeCart, count, subtotal, increase, decrease, removeItem } = useCart();
  const closeRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKey = (e) => e.key === 'Escape' && closeCart();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeCart]);

  return (
    <div className={`cart-drawer ${isOpen ? 'is-open' : ''}`} aria-hidden={!isOpen}>
      <div className="cart-overlay" onClick={closeCart} />

      <aside className="cart-panel" role="dialog" aria-modal="true" aria-label="Shopping cart">
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
            <ul className="cart-items">
              {items.map((item) => (
                <li key={item.id} className="cart-item">
                  <img src={item.image} alt="" />

                  <div className="cart-item-info">
                    <h3>{item.name}</h3>
                    <p>{formatPeso(item.price)}</p>
                    {item.status === 'pre-order' && <span className="cart-tag">Pre-order</span>}

                    <div className="cart-qty">
                      <button type="button" onClick={() => decrease(item.id)} aria-label={`Decrease quantity of ${item.name}`}>−</button>
                      <span aria-live="polite">{item.qty}</span>
                      <button type="button" onClick={() => increase(item.id)} aria-label={`Increase quantity of ${item.name}`}>+</button>
                    </div>
                  </div>

                  <button type="button" className="cart-remove" onClick={() => removeItem(item.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <footer className="cart-footer">
              <div className="cart-subtotal">
                <span>Subtotal</span>
                <strong>{formatPeso(subtotal)}</strong>
              </div>
              <p>Shipping is calculated at checkout.</p>
              {/* TODO: connect to your checkout page / payment flow */}
              <button type="button" className="button cart-checkout">Checkout</button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
