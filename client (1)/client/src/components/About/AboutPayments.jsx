import { Link } from 'react-router-dom';
import Pending from './Pending.jsx';

export default function AboutPayments({ content }) {
  return (
    <section className="about-payments">
      <div className="about-section">
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

        <div className="about-link-row">
          {content.links.map(({ label, to }) => (
            <Link key={label} className="about-link" to={to}>
              {label} <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
