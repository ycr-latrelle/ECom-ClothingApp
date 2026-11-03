import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Hero.css';

// Same image for now - swap each src when you have more shots.
const slides = [
  { src: '/images/hero-image-1.png', alt: 'Streetwear look from the latest collection' },
  { src: '/images/hero-image-2.png', alt: 'Streetwear look from the latest collection' },
  { src: '/images/hero-image-3.png', alt: 'Streetwear look from the latest collection' },
];

const pad = (n) => String(n).padStart(2, '0');

export default function Hero() {
  const [state, setState] = useState({ index: 0, prev: null, dir: 'next' });

  const go = (step) =>
    setState(({ index }) => ({
      index: (index + step + slides.length) % slides.length,
      prev: index,
      dir: step > 0 ? 'next' : 'prev',
    }));

  const { index, prev, dir } = state;

  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">Premium streetwear &amp; essentials</p>

        <h1>
          Timeless fits.
          <br />
          <span className="hero-accent">Modern living.</span>
        </h1>

        <p className="hero-description">
          Curated pieces for everyday wear — from classic staples to exclusive pre-orders.
        </p>

        <div className="hero-actions">
          <Link className="button button-primary" to="/shop">
            Shop now <span aria-hidden="true">→</span>
          </Link>

          <Link className="button button-outline" to="/pre-order">
            Explore pre-orders
          </Link>
        </div>

        <div className="trust-row">
          <div>
            <strong aria-hidden="true">◇</strong>
            <b>Secure payments</b>
            <span>GCash / Maya QR</span>
          </div>

          <div>
            <strong aria-hidden="true">↗</strong>
            <b>Nationwide shipping</b>
            <span>Philippines</span>
          </div>

          <div>
            <strong aria-hidden="true">☆</strong>
            <b>Quality selected</b>
            <span>Authentic &amp; trusted</span>
          </div>
        </div>
      </div>

      <div className="hero-visual">
        <div className="hero-wall" aria-hidden="true" />

        {prev !== null && prev !== index && (
          <div
            key={`leave-${prev}-${index}`}
            className={`hero-slide leave-${dir}`}
            aria-hidden="true"
            onAnimationEnd={() => setState((s) => ({ ...s, prev: null }))}
          >
            <img className="hero-model" src={slides[prev].src} alt="" />
          </div>
        )}

        <div key={`enter-${index}`} className={`hero-slide enter-${dir}`}>
          <img className="hero-model" src={slides[index].src} alt={slides[index].alt} />
        </div>

        <div className="hero-panel">
          <p>
            New
            <br />
            season
            <br />
            drop
          </p>
          <i aria-hidden="true" />
          <div className="hero-pager">
            <span aria-live="polite">
              {pad(index + 1)} / {pad(slides.length)}
            </span>
            <button type="button" onClick={() => go(-1)} aria-label="Previous slide">←</button>
            <button type="button" onClick={() => go(1)} aria-label="Next slide">→</button>
          </div>
        </div>
      </div>
    </section>
  );
}