import { Link } from 'react-router-dom';

export default function ShoppingOptions({ content }) {
  return (
    <section className="about-section">
      <header className="about-heading">
        <p className="eyebrow">{content.eyebrow}</p>
        <h2>{content.title}</h2>
      </header>

      <div className="about-options">
        {content.cards.map((card) => (
          <article key={card.id} className={`about-option is-${card.id}`}>
            <h3>{card.title}</h3>
            <p>{card.text}</p>
            <Link className="about-link" to={card.to}>
              {card.cta} <span aria-hidden="true">→</span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
