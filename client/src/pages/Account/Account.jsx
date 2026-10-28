import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import SignInForm from '../../components/Account/SignInForm.jsx';
import RegisterForm from '../../components/Account/RegisterForm.jsx';
import ForgotPasswordForm from '../../components/Account/ForgotPasswordForm.jsx';
import ProfileForm from '../../components/Account/ProfileForm.jsx';
import AccountSteps from '../../components/Account/AccountSteps.jsx';
import AccountSummary from '../../components/Account/AccountSummary.jsx';
import './Account.css';

const TITLES = {
  signin: 'Sign in',
  register: 'Create your account',
  forgot: 'Reset your password',
  profile: 'Tell us about you',
};

export default function Account() {
  const {
    user,
    loading,
    configured,
    profile,
    profileLoading,
    profileFailed,
    reloadProfile,
    signOut,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // RequireAuth saves where the customer was headed (and any router state, such as
  // checkout's `directItem`) here. Ignore it if it points back to this screen.
  const saved = location.state?.from;
  const from = saved?.pathname && saved.pathname !== '/account' ? saved : null;

  const [view, setView] = useState('signin');
  const [notice, setNotice] = useState('');
  const [returning, setReturning] = useState(false);

  // Signed in, but no saved profile yet: this is step 2 of registration. It also
  // catches accounts that were created before the profile step existed.
  const needsProfile = Boolean(user) && !profileLoading && !profileFailed && !profile;

  // After signing in or finishing registration, wait until the auth context has both
  // the user and their profile, so a protected route doesn't bounce them back here.
  useEffect(() => {
    if (!returning || !user || profileLoading || !profile) return;

    const target = from ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : '/shop';
    navigate(target, { replace: true, state: from?.state ?? null });
  }, [returning, user, profile, profileLoading, from, navigate]);

  const reason = from?.pathname === '/checkout'
    ? 'Sign in or create an account to continue to checkout.'
    : from
      ? 'Sign in or create an account to continue.'
      : 'You can browse and fill your cart without an account. We only ask you to sign in when you’re ready to check out.';

  let intro = null;
  if (needsProfile) {
    intro = 'One last step. We use these details to fill in checkout for you and to deliver your orders.';
  } else if (!user) {
    intro = view === 'register'
      ? 'Start with your email and a password. Next, we’ll ask for a few details so checkout is quick.'
      : reason;
  }

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
  } else if (loading || profileLoading) {
    content = <p className="account-status" role="status">Checking your account…</p>;
  } else if (profileFailed) {
    content = (
      <div className="account-setup" role="alert">
        <h2>We couldn’t load your details</h2>
        <p>Check your connection and try again.</p>
        <button type="button" className="account-button" onClick={reloadProfile}>
          Try again
        </button>
        <button type="button" className="account-link" onClick={() => signOut().catch(() => {})}>
          Sign out
        </button>
      </div>
    );
  } else if (returning && user && profile) {
    content = (
      <p className="account-banner is-success" role="status">
        You’re signed in. Taking you {from ? 'back' : 'to the shop'}…
      </p>
    );
  } else if (needsProfile) {
    content = (
      <>
        <AccountSteps current={2} />
        <ProfileForm onSaved={() => setReturning(true)} />
      </>
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

        {view === 'register' && <AccountSteps current={1} />}

        {view === 'signin' && (
          <SignInForm onForgot={() => setView('forgot')} onAuthenticated={() => setReturning(true)} />
        )}
        {view === 'register' && <RegisterForm onAuthenticated={() => setReturning(true)} />}
        {view === 'forgot' && <ForgotPasswordForm onBack={() => setView('signin')} />}
      </>
    );
  }

  const heading = needsProfile
    ? TITLES.profile
    : user && !returning
      ? 'Your account'
      : TITLES[view];

  return (
    <main className={`account-page ${needsProfile ? 'is-wide' : ''}`.trim()}>
      <section className="account-intro">
        <p className="eyebrow">Account</p>
        <h1>{configured ? heading : 'Account'}</h1>
        {configured && intro && <p>{intro}</p>}
      </section>

      <section className="account-card" aria-label="Account">
        {content}
      </section>
    </main>
  );
}
