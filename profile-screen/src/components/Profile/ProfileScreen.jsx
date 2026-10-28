import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import { friendlyAuthError } from '../Account/authErrors.js';
import { AboutFields, AddressFields, NameFields } from '../Account/ProfileFieldGroups.jsx';
import { formatAddress, fullName, genderLabel } from '../Account/profileFields.js';
import AvatarCustomizer from './AvatarCustomizer.jsx';
import ProfileAvatar from './ProfileAvatar.jsx';
import ProfileSection from './ProfileSection.jsx';
import { useProfilePrefs } from './useProfilePrefs.js';
import './Profile.css';

const PERSONAL_KEYS = ['firstName', 'middleName', 'lastName', 'age', 'gender'];
const ADDRESS_KEYS = ['street', 'barangay', 'city', 'province', 'postalCode'];

function Detail({ label, children, wide = false }) {
  return (
    <div className={wide ? 'is-wide' : undefined}>
      <dt>{label}</dt>
      <dd>{children || <span className="profile-empty">Not provided</span>}</dd>
    </div>
  );
}

// Email, password reset and sign out.
function AccountCard({ email, onSignedOut }) {
  const { sendPasswordReset, signOut } = useAuth();
  const [message, setMessage] = useState({ kind: '', text: '' });
  const [busy, setBusy] = useState('');

  const handleReset = async () => {
    setBusy('reset');
    setMessage({ kind: '', text: '' });
    try {
      await sendPasswordReset(email);
      setMessage({ kind: 'success', text: `We sent a password reset link to ${email}.` });
    } catch (error) {
      setMessage({ kind: 'error', text: friendlyAuthError(error) });
    } finally {
      setBusy('');
    }
  };

  const handleSignOut = async () => {
    setBusy('signout');
    setMessage({ kind: '', text: '' });
    try {
      await signOut();
      onSignedOut();
    } catch (error) {
      setMessage({ kind: 'error', text: friendlyAuthError(error) });
      setBusy('');
    }
  };

  return (
    <section className="profile-section" aria-label="Sign-in and security">
      <div className="profile-section-head">
        <h2>Sign-in and security</h2>
      </div>

      <dl className="profile-details">
        <Detail label="Email address" wide>{email}</Detail>
      </dl>

      {message.text && (
        <p
          className={`account-banner ${message.kind === 'error' ? 'is-error' : 'is-success'}`}
          role={message.kind === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      )}

      <div className="profile-form-actions">
        <button
          type="button"
          className="account-button is-small is-outline"
          onClick={handleReset}
          disabled={Boolean(busy)}
        >
          {busy === 'reset' ? 'Sending…' : 'Change password'}
        </button>
        <button
          type="button"
          className="account-button is-small is-outline"
          onClick={handleSignOut}
          disabled={Boolean(busy)}
        >
          {busy === 'signout' ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </section>
  );
}

// The signed-in /account screen. Render with key={user.uid}.
export default function ProfileScreen({ onSignedOut }) {
  const { user, profile } = useAuth();
  const { prefs, update, reset } = useProfilePrefs(user.uid);
  const [customizing, setCustomizing] = useState(false);

  const name = fullName(profile);
  const initial = ([...profile.firstName][0] ?? '?').toUpperCase();

  return (
    <main className="profile-page">
      <header className="profile-hero">
        <ProfileAvatar name={profile.firstName} prefs={prefs} size={96} />
        <div className="profile-hero-text">
          <p className="eyebrow">Your profile</p>
          <h1>{name}</h1>
          <p className="profile-email">{user.email}</p>
          <button
            type="button"
            className="account-link"
            aria-expanded={customizing}
            aria-controls="avatar-customizer"
            onClick={() => setCustomizing((open) => !open)}
          >
            {customizing ? 'Close avatar options' : 'Customize avatar'}
          </button>
        </div>
      </header>

      {customizing && (
        <AvatarCustomizer
          id="avatar-customizer"
          prefs={prefs}
          initial={initial}
          onChange={update}
          onReset={reset}
          onDone={() => setCustomizing(false)}
        />
      )}

      <ProfileSection
        title="Personal details"
        keys={PERSONAL_KEYS}
        renderFields={(field) => (
          <>
            <NameFields field={field} autoFocus />
            <AboutFields field={field} />
          </>
        )}
        summary={(
          <dl className="profile-details">
            <Detail label="Name">{name}</Detail>
            <Detail label="Age">{profile.age ? String(profile.age) : ''}</Detail>
            <Detail label="Gender">{genderLabel(profile.gender)}</Detail>
          </dl>
        )}
      />

      <ProfileSection
        title="Delivery address"
        keys={ADDRESS_KEYS}
        renderFields={(field) => <AddressFields field={field} autoFocus />}
        summary={(
          <dl className="profile-details">
            <Detail label="Address" wide>{formatAddress(profile.address)}</Detail>
          </dl>
        )}
      />

      <AccountCard email={user.email} onSignedOut={onSignedOut} />

      <Link className="account-button" to="/shop">Continue shopping</Link>
    </main>
  );
}
