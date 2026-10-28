import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import SignInForm from '../../components/Account/SignInForm.jsx';
import RegisterForm from '../../components/Account/RegisterForm.jsx';
import ForgotPasswordForm from '../../components/Account/ForgotPasswordForm.jsx';
import AccountSummary from '../../components/Account/AccountSummary.jsx';
import './Account.css';

const TITLES = {
  signin: 'Sign in',
  register: 'Create your account',
  forgot: 'Reset your password',
};

export default function Account() {
  const { user, loading, configured } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // RequireAuth saves where the customer was headed (and any router state, such as
  // checkout's `directItem`) here. Ignore it if it points back to this screen.
  const saved = location.state?.from;
  const from = saved?.pathname && saved.pathname !== '/account' ? saved : null;

  const [view, setView] = useState('signin');
  const [notice, setNotice] = useState('');
  const [returning, setReturning] = useState(false);

  // After a successful sign-in or registration, wait until the auth context actually
  // has the user, so a protected route doesn't bounce them straight back here.
  useEffect(() => {
    if (!returning || !user) return;

    const target = from ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : '/shop';
    navigate(target, { replace: true, state: from?.state ?? null });
  }, [returning, user, from, navigate]);

  const reason = from?.pathname === '/checkout'
    ? 'Sign in or create an account to continue to checkout.'
    : from
      ? 'Sign in or create an account to continue.'
      : 'You can browse and fill your cart without an account. We only ask you to sign in when you’re ready to check out.';

  let content;

  if (!configured) {
    content = (
      <div className="account-setup" role="alert">
        <h2>Sign-in isn’t set up yet</h2>
        <p>
          This store’s Firebase settings are missing, so accounts and checkout are unavailable
          for now. Add the <code>VITE_FIREBASE_*</code> values to <code>client/.env.local</code>{' '}
          and restart the dev server.
        </p>
        <Link className="account-button" to="/shop">Continue browsing</Link>
      </div>
    );
  } else if (loading) {
    content = <p className="account-status" role="status">Checking your account…</p>;
  } else if (returning) {
    content = (
      <p className="account-banner is-success" role="status">
        You’re signed in. Taking you {from ? 'back' : 'to the shop'}…
      </p>
    );
  } else if (user) {
    content = (
      <AccountSummary
        onSignedOut={() => {
          setView('signin');
          setNotice('You have been signed out.');
        }}
      />
    );
  } else {
    content = (
      <>
        {notice && <p className="account-banner is-success" role="status">{notice}</p>}

        {view !== 'forgot' && (
          <div className="account-switch" role="group" aria-label="Choose sign in or create account">
            {[['signin', 'Sign in'], ['register', 'Create account']].map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                className={view === value ? 'is-active' : ''}
                onClick={() => {
                  setView(value);
                  setNotice('');
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {view === 'signin' && (
          <SignInForm onForgot={() => setView('forgot')} onAuthenticated={() => setReturning(true)} />
        )}
        {view === 'register' && <RegisterForm onAuthenticated={() => setReturning(true)} />}
        {view === 'forgot' && <ForgotPasswordForm onBack={() => setView('signin')} />}
      </>
    );
  }

  const heading = user && !returning ? 'Your account' : TITLES[view];

  return (
    <main className="account-page">
      <section className="account-intro">
        <p className="eyebrow">Account</p>
        <h1>{configured ? heading : 'Account'}</h1>
        {!user && configured && <p>{reason}</p>}
      </section>

      <section className="account-card" aria-label="Account">
        {content}
      </section>
    </main>
  );
}
