import { Link } from 'react-router-dom';

export default function AboutHero({ content }) {
  return (
    <section className="about-hero">
      <div className="about-hero-copy">
        <p className="eyebrow">{content.eyebrow}</p>
        <h1>{content.title}</h1>
        <p className="about-lead">{content.intro}</p>
        <div className="about-actions">
          {content.actions.map(({ label, to, variant }) => (
            <Link key={label} className={`about-button is-${variant}`} to={to}>
              {label} <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="about-hero-visual">
        <div className="about-hero-bar" aria-hidden="true" />
        <img src={content.image.src} alt={content.image.alt} />
      </div>
    </section>
  );
}
