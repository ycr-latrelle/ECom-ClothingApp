import { NavLink } from 'react-router-dom';
import './AccountNav.css';

// Switches between the profile and the order history inside the account area.
export default function AccountNav() {
  return (
    <nav className="account-nav" aria-label="Account sections">
      <NavLink to="/account" end>Profile</NavLink>
      <NavLink to="/account/orders">My Orders</NavLink>
    </nav>
  );
}
