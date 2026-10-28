import { useState } from 'react';
import { useAuth } from '../../context/useAuth.js';
import AccountField from './AccountField.jsx';
import { EMAIL_PATTERN, friendlyAuthError } from './authErrors.js';

export default function ForgotPasswordForm({ onBack }) {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    setFormError('');
    setSentTo('');

    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Enter a valid email address.');
      form.elements.namedItem('email')?.focus();
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await sendPasswordReset(email);
      setSentTo(email.trim());
    } catch (err) {
      setFormError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="account-form" onSubmit={handleSubmit} noValidate>
      <p className="account-lede">
        Enter the email you signed up with and we’ll send you a link to choose a new password.
      </p>

      <AccountField
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        error={error}
        onChange={(e) => {
          setEmail(e.target.value);
          setError('');
        }}
      />

      {formError && <p className="account-banner is-error" role="alert">{formError}</p>}

      {sentTo && (
        <p className="account-banner is-success" role="status">
          If an account exists for {sentTo}, a reset link is on its way. Check your spam folder too.
        </p>
      )}

      <button className="account-button" type="submit" disabled={submitting}>
        {submitting ? 'Sending…' : sentTo ? 'Send again' : 'Send reset link'}
      </button>

      <button type="button" className="account-link" onClick={onBack}>
        <span aria-hidden="true">←</span> Back to sign in
      </button>
    </form>
  );
}
