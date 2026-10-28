import { useEffect, useId, useRef, useState } from 'react';
import { useAuth } from '../../context/useAuth.js';
import { useAuthPanel } from '../../context/useAuthPanel.js';
import SignInForm from '../Account/SignInForm.jsx';
import RegisterForm from '../Account/RegisterForm.jsx';
import ForgotPasswordForm from '../Account/ForgotPasswordForm.jsx';
import ProfileForm from '../Account/ProfileForm.jsx';
import AccountSteps from '../Account/AccountSteps.jsx';
import '../../pages/Account/Account.css'; // the forms are styled by the Account stylesheet
import './AuthPanel.css';

const TITLES = {
  signin: 'Sign in',
  register: 'Create your account',
  forgot: 'Reset your password',
  profile: 'Tell us about you',
};

const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

const noop = () => {};

export default function AuthPanel() {
  const { open } = useAuthPanel();
  return open ? <PanelContent /> : null;
}

function PanelContent() {
  const { reason, closeAuthPanel, completeAuthPanel } = useAuthPanel();
  const {
    user,
    loading,
    configured,
    profile,
    profileLoading,
    profileFailed,
    reloadProfile,
  } = useAuth();

  const [view, setView] = useState('signin');
  const panelRef = useRef(null);
  const titleId = useId();

  const signedIn = Boolean(user) && Boolean(profile);
  const needsProfile = Boolean(user) && !profileLoading && !profileFailed && !profile;

  // Signed in with a saved profile: hand back to whatever the customer was doing.
  useEffect(() => {
    if (signedIn && !profileLoading) completeAuthPanel();
  }, [signedIn, profileLoading, completeAuthPanel]);

  // Escape closes, Tab stays inside the panel, page behind does not scroll.
  useEffect(() => {
    const previous = document.activeElement;
    document.body.style.overflow = 'hidden';

    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeAuthPanel();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;
      event.stopPropagation();

      const nodes = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter(
        (node) => node.offsetParent !== null,
      );
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;

      if (!panelRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey, true);

    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = '';
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [closeAuthPanel]);

  // Put the cursor in the first field whenever the form changes.
  useEffect(() => {
    const target = panelRef.current?.querySelector('input') ?? panelRef.current?.querySelector('.auth-panel-close');
    target?.focus();
  }, [view, needsProfile]);

  let title = TITLES[view];
  let intro = view === 'register'
    ? 'Start with your email and a password. Next, we’ll ask for a few details so checkout is quick.'
    : reason;
  let body;

  if (!configured) {
    title = 'Sign-in isn’t set up yet';
    intro = null;
    body = (
      <div className="account-setup" role="alert">
        <p>
          This store’s Firebase settings are missing, so accounts and checkout are unavailable
          for now.
        </p>
        <button type="button" className="account-button" onClick={closeAuthPanel}>
          Continue browsing
        </button>
      </div>
    );
  } else if (loading || profileLoading || signedIn) {
    title = signedIn ? 'You’re signed in' : 'One moment';
    intro = null;
    body = (
      <p className="account-status" role="status">
        {signedIn ? 'Taking you to checkout…' : 'Checking your account…'}
      </p>
    );
  } else if (profileFailed) {
    title = 'We couldn’t load your details';
    intro = null;
    body = (
      <div className="account-setup" role="alert">
        <p>Check your connection and try again.</p>
        <button type="button" className="account-button" onClick={reloadProfile}>
          Try again
        </button>
      </div>
    );
  } else if (needsProfile) {
    title = TITLES.profile;
    intro = 'One last step. We use these details to fill in checkout for you and to deliver your orders.';
    body = (
      <>
        <AccountSteps current={2} />
        <ProfileForm onSaved={noop} />
      </>
    );
  } else {
    body = (
      <>
        {view !== 'forgot' && (
          <div className="account-switch" role="group" aria-label="Choose sign in or create account">
            {[['signin', 'Sign in'], ['register', 'Create account']].map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                className={view === value ? 'is-active' : ''}
                onClick={() => setView(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {view === 'register' && <AccountSteps current={1} />}

        {view === 'signin' && <SignInForm onForgot={() => setView('forgot')} onAuthenticated={noop} />}
        {view === 'register' && <RegisterForm onAuthenticated={noop} />}
        {view === 'forgot' && <ForgotPasswordForm onBack={() => setView('signin')} />}
      </>
    );
  }

  return (
    <div className="auth-panel-root">
      <div className="auth-panel-overlay" onClick={closeAuthPanel} />

      <section
        ref={panelRef}
        className={`auth-panel ${needsProfile ? 'is-wide' : ''}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="auth-panel-header">
          <div>
            <p className="eyebrow">Account</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button type="button" className="auth-panel-close" onClick={closeAuthPanel} aria-label="Close">
            ✕
          </button>
        </header>

        {intro && <p className="auth-panel-intro">{intro}</p>}

        <div className="auth-panel-body">{body}</div>
      </section>
    </div>
  );
}
