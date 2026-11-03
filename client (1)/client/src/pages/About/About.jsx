import AboutHero from '../../components/About/AboutHero.jsx';
import AboutStory from '../../components/About/AboutStory.jsx';
import ShoppingOptions from '../../components/About/ShoppingOptions.jsx';
import PreOrderSteps from '../../components/About/PreOrderSteps.jsx';
import AboutStandards from '../../components/About/AboutStandards.jsx';
import AboutPayments from '../../components/About/AboutPayments.jsx';
import AboutFaq from '../../components/About/AboutFaq.jsx';
import AboutCta from '../../components/About/AboutCta.jsx';
import { aboutContent as c } from '../../data/aboutContent.js';
import './About.css';

export default function About() {
  const vars = c.settings;

  return (
    <main className="about-page">
      <AboutHero content={c.hero} />
      <AboutStory content={c.story} />
      <ShoppingOptions content={c.ways} />
      <PreOrderSteps content={c.preOrder} vars={vars} />
      <AboutStandards content={c.standards} />
      <AboutPayments content={c.payments} />
      <AboutFaq content={c.faq} vars={vars} />
      <AboutCta content={c.cta} />
    </main>
  );
}
