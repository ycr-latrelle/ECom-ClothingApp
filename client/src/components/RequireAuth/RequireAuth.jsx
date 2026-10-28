import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import './RequireAuth.css';

// Wrap a route element to make it available to signed-in customers only.
// Signed-out visitors are sent to /account, with the page they wanted (including
// router state such as QuickCheckout's `directItem`) saved in `location.state.from`
// so the Account screen can send them back after sign-in.
export default function RequireAuth({ children }) {
  const { user, loading, profile, profileLoading } = useAuth();
  const location = useLocation();

  if (loading || profileLoading) {
    return (
      <main className="require-auth-loading" role="status" aria-live="polite">
        <p>Checking your account…</p>
      </main>
    );
  }

  // No profile yet means registration step 2 isn't finished; /account shows it.
  if (!user || !profile) {
    const { pathname, search, hash, state } = location;
    return <Navigate to="/account" replace state={{ from: { pathname, search, hash, state } }} />;
  }

  return children;
}
