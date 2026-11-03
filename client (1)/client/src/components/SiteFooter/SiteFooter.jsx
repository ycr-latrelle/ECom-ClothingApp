import { Link } from 'react-router-dom';
import './SiteFooter.css';

const links = [
  ['Shop', '/shop'],
  ['Pre-order', '/pre-order'],
  ['About', '/about'],
  ['Journal', '/journal'],
];

const socials = [
  {
    label: 'Instagram',
    href: 'https://instagram.com',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://facebook.com',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M14 8.5V6.9c0-.7.2-1.1 1.2-1.1H17V3h-2.4C12 3 10.8 4.5 10.8 6.7v1.8H8.5v2.8h2.3V21H14v-9.7h2.6l.4-2.8H14z" />
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://tiktok.com',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16.5 3c.3 2.2 1.7 3.8 4 4v3.1c-1.4 0-2.7-.4-4-1.2v6.2a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v3.2a2.5 2.5 0 1 0 1.6 2.3V3h3.1z" />
      </svg>
    ),
  },
];

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-top">
        <div className="site-footer-brand">
          <Link to="/" className="site-footer-logo">THREAD / THEORY</Link>
          <p>Timeless fits for modern living.</p>
        </div>

        <nav className="site-footer-nav" aria-label="Footer navigation">
          {links.map(([label, path]) => (
            <Link key={label} to={path}>{label}</Link>
          ))}
        </nav>

        <ul className="site-footer-social">
          {socials.map(({ label, href, icon }) => (
            <li key={label}>
              <a href={href} target="_blank" rel="noreferrer" aria-label={label}>
                {icon}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="site-footer-bottom">
        <p>© {new Date().getFullYear()} THREAD / THEORY. All rights reserved.</p>
        <div>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}