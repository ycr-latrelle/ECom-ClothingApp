import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import { friendlyAuthError } from './authErrors.js';

export default function AccountSummary({ onSignedOut }) {
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const name = user.displayName?.trim();
  const initial = (name || user.email || '?').charAt(0).toUpperCase();

  const handleSignOut = async () => {
    setBusy(true);
    setError('');
    try {
      await signOut();
      onSignedOut();
    } catch (err) {
      setError(friendlyAuthError(err));
      setBusy(false);
    }
  };

  return (
    <div className="account-summary">
      <div className="account-identity">
        <span className="account-avatar" aria-hidden="true">{initial}</span>
        <div>
          <p className="account-identity-label">Signed in as</p>
          <h2>{name || user.email}</h2>
          {name && <p className="account-identity-email">{user.email}</p>}
        </div>
      </div>

      {error && <p className="account-banner is-error" role="alert">{error}</p>}

      <div className="account-actions">
        <Link className="account-button" to="/shop">Continue shopping</Link>
        <button type="button" className="account-button is-outline" onClick={handleSignOut} disabled={busy}>
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}
