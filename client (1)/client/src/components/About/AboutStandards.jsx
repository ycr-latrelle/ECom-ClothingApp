import { Link } from 'react-router-dom';
import Pending from './Pending.jsx';

export default function AboutStandards({ content }) {
  return (
    <section className="about-section">
      <header className="about-heading">
        <p className="eyebrow">{content.eyebrow}</p>
        <h2>{content.title}</h2>
      </header>

      <ul className="about-cards">
        {content.items.map((item) => (
          <li key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
            {item.pending && <Pending />}
          </li>
        ))}
      </ul>

      <Link className="about-link" to={content.cta.to}>
        {content.cta.label} <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
