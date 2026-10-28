import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import { useAuthPanel } from '../../context/useAuthPanel.js';
import './RequireAuth.css';

const REASON = 'Sign in or create an account to continue to checkout.';

// Wrap a route element to make it available to signed-in customers only.
// Signed-out visitors (for example, someone opening /checkout directly) see the
// floating sign-in panel over this page. Once they finish, the page they wanted
// appears in place, with router state such as QuickCheckout's `directItem` intact.
// Closing the panel sends them back to the shop.
export default function RequireAuth({ children }) {
  const { user, loading, profile, profileLoading } = useAuth();
  const { requireAuth } = useAuthPanel();
  const navigate = useNavigate();

  const checking = loading || profileLoading;
  // No profile yet means registration step 2 isn't finished; the panel shows it.
  const needsAuth = !checking && (!user || !profile);

  useEffect(() => {
    if (!needsAuth) return;

    requireAuth(null, {
      reason: REASON,
      onCancel: () => navigate('/shop', { replace: true }),
    });
  }, [needsAuth, requireAuth, navigate]);

  if (checking) {
    return (
      <main className="require-auth-loading" role="status" aria-live="polite">
        <p>Checking your account…</p>
      </main>
    );
  }

  if (needsAuth) {
    return (
      <main className="require-auth-prompt">
        <h1>Sign in to continue</h1>
        <p>You need an account to check out.</p>
        <button
          type="button"
          className="require-auth-button"
          onClick={() =>
            requireAuth(null, {
              reason: REASON,
              onCancel: () => navigate('/shop', { replace: true }),
            })
          }
        >
          Sign in or create account
        </button>
      </main>
    );
  }

  return children;
}
