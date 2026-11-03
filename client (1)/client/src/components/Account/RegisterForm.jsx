import { useState } from 'react';
import { useAuth } from '../../context/useAuth.js';
import AccountField from './AccountField.jsx';
import PasswordField from './PasswordField.jsx';
import { EMAIL_PATTERN, MIN_PASSWORD_LENGTH, friendlyAuthError } from './authErrors.js';

// Step 1 of 2: email and password. The account is created here, so a taken email or
// weak password is reported straight away. Step 2 (ProfileForm) appears next.
export default function RegisterForm({ onAuthenticated }) {
  const { register } = useAuth();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!EMAIL_PATTERN.test(values.email.trim())) next.email = 'Enter a valid email address.';
    if (values.password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
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
      await register(values.email, values.password);
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
        value={values.email}
        error={errors.email}
        onChange={update('email')}
      />

      <PasswordField
        label="Password"
        name="password"
        autoComplete="new-password"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        value={values.password}
        error={errors.password}
        onChange={update('password')}
      />

      {formError && <p className="account-banner is-error" role="alert">{formError}</p>}

      <button className="account-button" type="submit" disabled={submitting}>
        {submitting ? 'Creating account…' : 'Continue'}
      </button>
    </form>
  );
}
