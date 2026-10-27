import { useCart } from '../../context/useCart.js';
import { formatPeso } from '../../data/products.js';
import './ProductCard.css';

export default function ProductCard({ id, name, price, image, status }) {
  const { addItem, openCart } = useCart();
  const preorder = status === 'pre-order';

  const handleAdd = () => {
    addItem({ id, name, price, image, status });
    openCart();
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
      <button type="button" className="product-card-add" onClick={handleAdd}>
        {preorder ? 'Pre-order now' : 'Add to cart'}
      </button>
    </article>
  );
}
