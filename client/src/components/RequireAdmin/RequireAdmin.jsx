
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import './RequireAdmin.css';

const ADMIN_ACCESS_URL =
  `${import.meta.env.VITE_API_BASE_URL}/api/admin/access`;

export default function RequireAdmin({ children }) {
  const {
    user,
    loading,
    profile,
    profileLoading,
  } = useAuth();

  const checking = loading || profileLoading;

  const [access, setAccess] = useState({
    uid: null,
    status: 'checking',
  });

  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (checking || !user || !profile) {
      setAccess({
        uid: user?.uid ?? null,
        status: 'checking',
      });

      return undefined;
    }

    let cancelled = false;

    async function verifyAdminAccess() {
      try {
        const token = await user.getIdToken();

        const response = await fetch(ADMIN_ACCESS_URL, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(
            `Admin access verification failed: HTTP ${response.status}`
          );
        }

        const result = await response.json();

        if (cancelled) return;

        setAccess({
          uid: user.uid,
          status: result.isAdmin === true
            ? 'allowed'
            : 'denied',
        });
      } catch (error) {
        console.error(
          'Could not verify administrative access:',
          error
        );

        if (cancelled) return;

        setAccess({
          uid: user.uid,
          status: 'error',
        });
      }
    }

    verifyAdminAccess();

    return () => {
      cancelled = true;
    };
  }, [user, checking, profile, retryCount]);

  if (checking) {
    return (
      <main className="require-admin-state" role="status">
        <p>Checking your account...</p>
      </main>
    );
  }

  if (!user || !profile) {
    return (
      <main className="require-admin-state">
        <h1>Sign in required</h1>

        <p>
          Sign in and complete your customer profile
          before accessing this page.
        </p>

        <Link to="/shop">
          Return to shop
        </Link>
      </main>
    );
  }

  if (
    access.uid !== user.uid ||
    access.status === 'checking'
  ) {
    return (
      <main className="require-admin-state" role="status">
        <p>Verifying administrative permissions...</p>
      </main>
    );
  }

  if (access.status === 'error') {
    return (
      <main className="require-admin-state">
        <h1>Unable to verify access</h1>

        <p>
          The server could not verify your administrative
          permissions. Access has been denied for security.
        </p>

        <button
          type="button"
          onClick={() => {
            setAccess({
              uid: user.uid,
              status: 'checking',
            });

            setRetryCount((count) => count + 1);
          }}
        >
          Try again
        </button>

        <p>
          <Link to="/">
            Return to storefront
          </Link>
        </p>
      </main>
    );
  }

  if (access.status !== 'allowed') {
    return (
      <main className="require-admin-state">
        <h1>Access denied</h1>

        <p>
          Your account does not have permission to access
          the administration workspace.
        </p>

        <Link to="/">
          Return to storefront
        </Link>
      </main>
    );
  }

  return children;
}
