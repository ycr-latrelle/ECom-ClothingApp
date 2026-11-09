import { useEffect, useRef, useState } from 'react';
import { useCart } from '../../context/useCart.js';
import ProductImage from '../ProductImage/ProductImage.jsx';
import { formatPeso } from '../../data/products.js';
import './ProductCard.css';

export default function ProductCard({
  id,
  name,
  price,
  image,
  category,
  status,
  sizes = [],
  colors = [],
  isInStock = true,
  availableVariants = [],
}) {
  const { addItem, openQuickCheckout } = useCart();
  const preorder = status === 'pre-order';

  const [added, setAdded] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Sizes come from the product record returned by the API.
  const unavailable = !preorder && !isInStock;
  const item = {
    id,
    name,
    price,
    image,
    category,
    status,
    sizes,
    colors,
    isInStock,
    availableVariants,
  };

  const handleCheckout = () => openQuickCheckout(item, 'checkout');

  const handleAdd = () => {
    if (sizes.length > 0 || colors.length > 0) {
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
        <ProductImage src={image} alt={name} loading="lazy" />
        <button
          type="button"
          className="product-card-save"
          aria-label={`Save ${name}`}
        >
          ♡
        </button>
      </div>

      <h3>{name}</h3>
      <p className="product-card-price">{formatPeso(price)}</p>

      <span className={`product-tag ${preorder ? 'is-preorder' : 'is-ready'}`}>
        {preorder ? 'Pre-order' : unavailable ? 'Out of stock' : 'Ready stock'}
      </span>

      <div className="product-card-actions">
        <button
          type="button"
          className={`product-card-add ${added ? 'is-added' : ''}`}
          onClick={handleAdd}
          disabled={unavailable}
        >
          <span aria-live="polite">
            {added ? (
              <>
                <svg className="added-check" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3 8.5l3.2 3.2L13 4.8" />
                </svg>
                Added
              </>
            ) : (
              unavailable ? 'Out of stock' : 'Add to cart'
            )}
          </span>
        </button>

        <button
          type="button"
          className="product-card-checkout"
          onClick={handleCheckout}
          disabled={unavailable}
        >
          Check out
        </button>
      </div>
    </article>
  );
}