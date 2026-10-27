import { Link } from 'react-router-dom';
import './PromoBanner.css';

export default function PromoBanner() {
  return (
    <section className="promo-banner">
      <div className="promo-banner-copy">
        <p className="eyebrow">Limited time</p>
        <h2>Exclusive pre-orders you don’t want to miss.</h2>
        <p>
          Get your hands on rare drops and limited pieces. Secure your favorite
          items now and be part of something special.
        </p>
        <Link className="button promo-banner-button" to="/pre-order">
          Browse pre-orders <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="promo-banner-visual">
        <img src="/images/pre-order-image.png" alt="Limited pre-order pieces" loading="lazy" />
        <p>Small quantities. Bigger stories.</p>
      </div>
    </section>
  );
}
