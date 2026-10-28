import { Link, Navigate, useLocation } from 'react-router-dom';
import { aboutContent, fill, policyContent } from '../../data/aboutContent.js';
import './Policy.css';

export default function Policy() {
  const key = useLocation().pathname.replace(/^\//, '');
  const policy = policyContent[key];

  if (!policy) return <Navigate to="/" replace />;

  return (
    <main className="policy-page">
      <p className="eyebrow">Policies</p>
      <h1>{policy.title}</h1>
      <p className="policy-intro">{policy.intro}</p>

      <div className="policy-sections">
        {policy.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{fill(section.text, aboutContent.settings)}</p>
            {section.pending && <span className="policy-pending">To be confirmed</span>}
          </section>
        ))}
      </div>

      <Link className="policy-back" to="/about">
        <span aria-hidden="true">←</span> Back to About
      </Link>
    </main>
  );
}
