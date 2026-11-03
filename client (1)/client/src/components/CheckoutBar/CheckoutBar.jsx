import { useCart } from '../../context/useCart.js';
import { formatPeso } from '../../data/products.js';
import './CheckoutBar.css';

// Shown on the Shop pages once something is in the cart.
// Opens the cart, where the customer ticks which items to check out.
export default function CheckoutBar() {
  const { count, selectedCount, dueNow, openCart } = useCart();

  if (count === 0) return null;

  return (
    <aside className="checkout-bar" aria-label="Cart summary">
      <p>
        <strong>{count} {count === 1 ? 'item' : 'items'}</strong> in your cart
        {selectedCount > 0 && (
          <span>
            {' '}· Due today <b>{formatPeso(dueNow)}</b>
          </span>
        )}
      </p>
      <button type="button" className="checkout-bar-button" onClick={openCart}>
        Checkout <span aria-hidden="true">→</span>
      </button>
    </aside>
  );
}
