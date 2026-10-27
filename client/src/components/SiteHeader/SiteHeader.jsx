import { Link, NavLink } from 'react-router-dom';
import './SiteHeader.css';

const links = [
  ['Home', '/'],
  ['Shop', '/shop'],
  ['Pre-order', '/pre-order'],
  ['About', '/about'],
  ['Journal', '/journal'],
];

export default function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="site-brand" to="/">THREAD / THEORY</Link>

      <nav className="site-nav" aria-label="Main navigation">
        {links.map(([label, path]) => (
          <NavLink
            key={label}
            to={path}
            end={path === '/'}
            className={({ isActive }) => isActive ? 'site-nav-link active' : 'site-nav-link'}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="site-header-actions">
        <Link to="/shop" className="header-icon" aria-label="Search products">⌕</Link>
        <Link to="/account" className="header-icon" aria-label="Your account">♙</Link>
        <Link to="/cart" className="header-icon bag-icon" aria-label="Shopping cart">
          ♧<span>0</span>
        </Link>
      </div>
    </header>
  );
}