import { useState } from 'react';
import { useAuth } from '../../context/useAuth.js';
import AccountField from './AccountField.jsx';
import { friendlyAuthError } from './authErrors.js';
import {
  EMPTY_PROFILE,
  GENDER_OPTIONS,
  cleanProfile,
  validateProfile,
} from './profileFields.js';

// Step 2 of 2: who the customer is and where to deliver. Shown to anyone who is
// signed in but has no saved profile yet (new accounts, and accounts that
// registered before this step existed).
export default function ProfileForm({ onSaved }) {
  const { user, saveProfile, signOut } = useAuth();
  const [values, setValues] = useState(EMPTY_PROFILE);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const field = (name) => ({
    name,
    value: values[name],
    error: errors[name],
    onChange: update(name),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    const next = validateProfile(values);
    setErrors(next);
    setFormError('');

    const firstInvalid = Object.keys(next)[0];
    if (firstInvalid) {
      form.elements.namedItem(firstInvalid)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await saveProfile(cleanProfile(values));
      onSaved();
    } catch (error) {
      console.error('Saving the customer profile failed.', error);
      setFormError(friendlyAuthError(error));
      setSubmitting(false);
    }
  };

  return (
    <form className="account-form" onSubmit={handleSubmit} noValidate>
      <p className="account-lede">
        Signed in as <strong>{user.email}</strong>. Fill in your details once and
        checkout will be ready for you next time.
      </p>

      <fieldset className="account-fieldset">
        <legend>Your name</legend>
        <div className="account-grid">
          <AccountField
            className="span-2"
            label="First name"
            autoComplete="given-name"
            {...field('firstName')}
          />
          <AccountField
            className="span-2"
            label="Middle name (optional)"
            autoComplete="additional-name"
            {...field('middleName')}
          />
          <AccountField
            className="span-2"
            label="Last name"
            autoComplete="family-name"
            {...field('lastName')}
          />
        </div>
      </fieldset>

      <fieldset className="account-fieldset">
        <legend>About you</legend>
        <div className="account-grid">
          <AccountField
            className="span-3"
            label="Age"
            inputMode="numeric"
            maxLength={3}
            autoComplete="off"
            {...field('age')}
          />
          <AccountField className="span-3" label="Gender" as="select" {...field('gender')}>
            <option value="">Select…</option>
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </AccountField>
        </div>
      </fieldset>

      <fieldset className="account-fieldset">
        <legend>Delivery address</legend>
        <div className="account-grid">
          <AccountField
            className="span-6"
            label="Street address"
            autoComplete="address-line1"
            {...field('street')}
          />
          <AccountField
            className="span-3"
            label="Barangay"
            autoComplete="address-line2"
            {...field('barangay')}
          />
          <AccountField
            className="span-3"
            label="City or municipality"
            autoComplete="address-level2"
            {...field('city')}
          />
          <AccountField
            className="span-3"
            label="Province"
            autoComplete="address-level1"
            {...field('province')}
          />
          <AccountField
            className="span-3"
            label="Postal code"
            inputMode="numeric"
            maxLength={4}
            autoComplete="postal-code"
            {...field('postalCode')}
          />
        </div>
      </fieldset>

      {formError && <p className="account-banner is-error" role="alert">{formError}</p>}

      <button className="account-button" type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : 'Finish creating account'}
      </button>

      <button
        type="button"
        className="account-link"
        onClick={() => signOut().catch(() => {})}
        disabled={submitting}
      >
        Not you? Sign out
      </button>
    </form>
  );
}
