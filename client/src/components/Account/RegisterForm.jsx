import { useState } from 'react';
import { useAuth } from '../../context/useAuth.js';
import AccountField from './AccountField.jsx';
import { EMAIL_PATTERN, MIN_PASSWORD_LENGTH, friendlyAuthError } from './authErrors.js';

export default function RegisterForm({ onAuthenticated }) {
  const { register } = useAuth();
  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    // clear the message for a field as soon as the customer edits it
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!values.name.trim()) next.name = 'Enter your name.';
    if (!EMAIL_PATTERN.test(values.email.trim())) next.email = 'Enter a valid email address.';
    if (values.password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (!values.confirm) next.confirm = 'Re-enter your password.';
    else if (values.confirm !== values.password) next.confirm = 'The passwords don’t match.';
    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    const next = validate();
    setErrors(next);
    setFormError('');

    const firstInvalid = Object.keys(next)[0];
    if (firstInvalid) {
      form.elements.namedItem(firstInvalid)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await register(values.name, values.email, values.password);
      onAuthenticated();
    } catch (error) {
      setFormError(friendlyAuthError(error));
      setSubmitting(false);
    }
  };

  return (
    <form className="account-form" onSubmit={handleSubmit} noValidate>
      <AccountField
        label="Full name"
        name="name"
        type="text"
        autoComplete="name"
        value={values.name}
        error={errors.name}
        onChange={update('name')}
      />

      <AccountField
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        value={values.email}
        error={errors.email}
        onChange={update('email')}
      />

      <AccountField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        value={values.password}
        error={errors.password}
        onChange={update('password')}
      />

      <AccountField
        label="Confirm password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        value={values.confirm}
        error={errors.confirm}
        onChange={update('confirm')}
      />

      {formError && <p className="account-banner is-error" role="alert">{formError}</p>}

      <button className="account-button" type="submit" disabled={submitting}>
        {submitting ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
