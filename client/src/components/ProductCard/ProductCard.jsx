import { useEffect, useRef, useState } from 'react';
import { useCart } from '../../context/useCart.js';
import { formatPeso, sizesFor } from '../../data/products.js';
import './ProductCard.css';

export default function ProductCard({ id, name, price, image, category, status }) {
  const { addItem, openQuickCheckout } = useCart();
  const preorder = status === 'pre-order';
  const sizes = sizesFor(category);

  const [added, setAdded] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  // sizes are picked in the floating window, so the card layout never changes
  const item = { id, name, price, image, category, status };

  const handleCheckout = () => openQuickCheckout(item, 'checkout');

  const handleAdd = () => {
    if (sizes.length > 0) {
      openQuickCheckout(item, 'cart');
      return;
    }

    addItem(item);
    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1600);
  };

  return (
    <article className="product-card">
      <div className="product-card-media">
        <img src={image} alt={name} loading="lazy" />
        <button type="button" className="product-card-save" aria-label={`Save ${name}`}>♡</button>
      </div>
      <h3>{name}</h3>
      <p className="product-card-price">{formatPeso(price)}</p>
      <span className={`product-tag ${preorder ? 'is-preorder' : 'is-ready'}`}>
        {preorder ? 'Pre-order' : 'Ready stock'}
      </span>

      <div className="product-card-actions">
        <button
          type="button"
          className={`product-card-add ${added ? 'is-added' : ''}`}
          onClick={handleAdd}
        >
          <span aria-live="polite">
            {added ? (
              <>
                <svg className="added-check" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3 8.5l3.2 3.2L13 4.8" />
                </svg>
                Added
              </>
            ) : 'Add to cart'}
          </span>
        </button>

        <button type="button" className="product-card-checkout" onClick={handleCheckout}>
          Check out
        </button>
      </div>
    </article>
  );
}
