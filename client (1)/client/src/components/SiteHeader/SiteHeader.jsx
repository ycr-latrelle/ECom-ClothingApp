import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
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
  const { user, loading } = useAuth();
  const isHome = useLocation().pathname === '/';
  const [scrolled, setScrolled] = useState(() => window.scrollY > 40);
  const headerRef = useRef(null);

  // Publish the header's real rendered height as --header-live-h. The fixed
  // --header-h token is only an estimate (on phones the header is a different
  // height), so anything that sticks under the header reads this instead.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return undefined;

    const publish = () =>
      document.documentElement.style.setProperty('--header-live-h', `${el.offsetHeight}px`);

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const accountLabel = loading
    ? 'Your account'
    : user
      ? `Your account, signed in as ${user.displayName?.trim() || user.email}`
      : 'Sign in or create an account';

  const className = [
    'site-header',
    isHome && 'is-floating',
    isHome && (scrolled ? 'is-dark' : 'is-transparent'),
  ].filter(Boolean).join(' ');

  return (
    <header ref={headerRef} className={className}>
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
        <Link to="/account" className="header-icon" aria-label={accountLabel}>♙</Link>
        <button
          type="button"
          className="header-icon bag-icon"
          aria-label={`Open shopping cart, ${count} items`}
          onClick={openCart}
        >
          ♧{count > 0 && <span key={count}>{count}</span>}
        </button>
      </div>
    </header>
  );
}
