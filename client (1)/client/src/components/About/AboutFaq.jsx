import { useId, useState } from 'react';
import { fill } from '../../data/aboutContent.js';
import Pending from './Pending.jsx';

export default function AboutFaq({ content, vars }) {
  const baseId = useId();
  const [open, setOpen] = useState(() => new Set());

  const toggle = (index) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <section className="about-section about-faq">
      <header className="about-heading">
        <p className="eyebrow">{content.eyebrow}</p>
        <h2>{content.title}</h2>
      </header>

      <div className="about-faq-list">
        {content.items.map((item, index) => {
          const isOpen = open.has(index);
          const buttonId = `${baseId}-q${index}`;
          const panelId = `${baseId}-a${index}`;

          return (
            <div key={item.q} className={`about-faq-item ${isOpen ? 'is-open' : ''}`}>
              <h3>
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(index)}
                >
                  <span>{fill(item.q, vars)}</span>
                  <i aria-hidden="true" />
                </button>
              </h3>

              <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!isOpen}>
                <p>{fill(item.a, vars)}</p>
                {item.pending && <Pending />}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
