import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProductCard from '../../components/ProductCard/ProductCard.jsx';
import { products } from '../../data/products.js';
import './Shop.css';

const FILTERS = [
  ['all', 'All'],
  ['tops', 'Tops'],
  ['bottoms', 'Bottoms'],
  ['footwear', 'Footwear'],
  ['accessories', 'Accessories'],
  ['pre-order', 'Pre-order'],
];

const SORTS = {
  featured: { label: 'Featured', fn: () => 0 },
  'price-asc': { label: 'Price: low to high', fn: (a, b) => a.price - b.price },
  'price-desc': { label: 'Price: high to low', fn: (a, b) => b.price - a.price },
  name: { label: 'Name: A to Z', fn: (a, b) => a.name.localeCompare(b.name) },
};

export default function Shop({ preorderOnly = false }) {
  const [params, setParams] = useSearchParams();

  const title = preorderOnly ? 'Pre-order' : 'Shop';
  const preorderCount = products.filter((p) => p.status === 'pre-order').length;

  const category = preorderOnly ? 'pre-order' : params.get('category') ?? 'all';
  const sort = SORTS[params.get('sort')] ? params.get('sort') : 'featured';

  const visible = useMemo(() => {
    const list = products.filter((p) => {
      if (category === 'all') return true;
      if (category === 'pre-order') return p.status === 'pre-order';
      return p.category === category;
    });
    return [...list].sort(SORTS[sort].fn);
  }, [category, sort]);

  const update = (key, value, fallback) => {
    const next = new URLSearchParams(params);
    if (value === fallback) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  return (
    <main className="shop-page">
      <header className="shop-hero">
        <div className="shop-hero-copy">
          <nav className="shop-crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{title}</span>
          </nav>

          <p className="eyebrow">{preorderOnly ? 'Limited drops' : 'All products'}</p>
          <h1>{title}</h1>
          <p className="shop-hero-text">
            {preorderOnly
              ? 'Secure rare pieces before they sell out.'
              : 'Classic staples and exclusive pre-orders for everyday wear.'}
          </p>

          <ul className="shop-hero-stats">
            <li><strong>{products.length}</strong> pieces</li>
            <li><strong>{preorderCount}</strong> on pre-order</li>
          </ul>
        </div>

        <div className="shop-hero-visual" aria-hidden="true">
          <div className="shop-hero-wall" />
          <div className="shop-hero-accent" />
          <img src="/images/hero-image.png" alt="" />
        </div>

        <span className="shop-hero-ghost" aria-hidden="true">{title}</span>
      </header>

      <section className="shop-body">
        <div className="shop-toolbar">
          {!preorderOnly && (
            <div className="shop-filters" role="group" aria-label="Filter by category">
              {FILTERS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={category === value}
                  className={category === value ? 'is-active' : ''}
                  onClick={() => update('category', value, 'all')}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="shop-sort">
            <span aria-live="polite">{visible.length} {visible.length === 1 ? 'item' : 'items'}</span>
            <label>
              <span className="visually-hidden">Sort products</span>
              <select value={sort} onChange={(e) => update('sort', e.target.value, 'featured')}>
                {Object.entries(SORTS).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="shop-empty">No products here yet. Check back after the next drop.</p>
        ) : (
          <div className="shop-grid">
            {visible.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}