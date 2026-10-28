import { useState } from 'react';
import { useAuth } from '../../context/useAuth.js';
import AccountField from './AccountField.jsx';
import { EMAIL_PATTERN, friendlyAuthError } from './authErrors.js';

export default function SignInForm({ onForgot, onAuthenticated }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    const next = {};
    if (!EMAIL_PATTERN.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';

    setErrors(next);
    setFormError('');

    const firstInvalid = Object.keys(next)[0];
    if (firstInvalid) {
      form.elements.namedItem(firstInvalid)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email, password);
      onAuthenticated();
    } catch (error) {
      setFormError(friendlyAuthError(error));
      setSubmitting(false);
    }
  };

  return (
    <form className="account-form" onSubmit={handleSubmit} noValidate>
      <AccountField
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        error={errors.email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <AccountField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        value={password}
        error={errors.password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {formError && <p className="account-banner is-error" role="alert">{formError}</p>}

      <button className="account-button" type="submit" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>

      <button type="button" className="account-link" onClick={onForgot}>
        Forgot your password?
      </button>
    </form>
  );
}
