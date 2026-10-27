import { fill } from '../../data/aboutContent.js';

export default function PreOrderSteps({ content, vars }) {
  return (
    <section className="about-steps">
      <div className="about-steps-inner">
        <header className="about-heading">
          <p className="eyebrow">{content.eyebrow}</p>
          <h2>{content.title}</h2>
        </header>

        <ol className="about-step-list">
          {content.steps.map((step) => (
            <li key={step.title}>
              <h3>{fill(step.title, vars)}</h3>
              <p>{fill(step.text, vars)}</p>
            </li>
          ))}
        </ol>

        {content.timeframe && <p className="about-timeframe">{content.timeframe}</p>}
      </div>
    </section>
  );
}
