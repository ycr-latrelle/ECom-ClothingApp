import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../../context/useCart.js';
import './SiteHeader.css';

const links = [
  ['Home', '/'],
  ['Shop', '/shop'],
  ['Pre-order', '/pre-order'],
  ['About', '/about'],
  ['Journal', '/journal'],
];

export default function SiteHeader() {
  const { count, openCart } = useCart();

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
        <button
          type="button"
          className="header-icon bag-icon"
          aria-label={`Open shopping cart, ${count} items`}
          onClick={openCart}
        >
          ♧{count > 0 && <span>{count}</span>}
        </button>
      </div>
    </header>
  );
}
