import { Link } from 'react-router-dom';

export default function AboutCta({ content }) {
  return (
    <section className="about-cta">
      <h2>{content.title}</h2>
      <p>{content.text}</p>
      <div className="about-actions">
        {content.actions.map(({ label, to, variant }) => (
          <Link key={label} className={`about-button is-${variant}`} to={to}>
            {label} <span aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
