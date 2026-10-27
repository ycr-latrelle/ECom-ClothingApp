import { useRef } from 'react';
import { Link } from 'react-router-dom';
import Hero from '../../components/Hero/Hero.jsx';
import CategoryCard from '../../components/CategoryCard/CategoryCard.jsx';
import ProductCard from '../../components/ProductCard/ProductCard.jsx';
import PromoBanner from '../../components/PromoBanner/PromoBanner.jsx';
import { products } from '../../data/products.js';
import './Home.css';

const categories = [
  { name: 'Tops', image: '/images/tops-image.png', to: '/shop?category=tops' },
  { name: 'Bottoms', image: '/images/bottoms-image.png', to: '/shop?category=bottoms' },
  { name: 'Footwear', image: '/images/footwear-image.png', to: '/shop?category=footwear' },
  { name: 'Accessories', image: '/images/accessories-image.png', to: '/shop?category=accessories' },
  { name: 'Pre-order', image: '/images/pre-order-image.png', to: '/pre-order' },
];

export default function Home() {
  const track = useRef(null);
  const scrollPicks = (direction) =>
    track.current?.scrollBy({ left: direction * 320, behavior: 'smooth' });

  return (
    <main className="home-page">
      <Hero />

      <section className="home-section">
        <div className="home-section-heading">
          <div>
            <p className="eyebrow">Shop by category</p>
            <h2>Find what fits your style</h2>
          </div>
          <Link to="/shop">View all <span aria-hidden="true">→</span></Link>
        </div>

        <div className="category-grid">
          {categories.map((category) => (
            <CategoryCard key={category.name} {...category} />
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-heading">
          <div>
            <p className="eyebrow">Featured items</p>
            <h2>Popular picks</h2>
          </div>
          <div className="picks-arrows">
            <button type="button" aria-label="Scroll left" onClick={() => scrollPicks(-1)}>←</button>
            <button type="button" aria-label="Scroll right" onClick={() => scrollPicks(1)}>→</button>
          </div>
        </div>

        <div className="picks-track" ref={track}>
          {products.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      </section>

      <PromoBanner />
    </main>
  );
}
