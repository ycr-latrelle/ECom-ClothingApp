import AccountField from './AccountField.jsx';
import { GENDER_OPTIONS } from './profileFields.js';

// The three groups of profile inputs, shared by registration step 2 (ProfileForm)
// and the editable sections on the profile screen. `field(name)` supplies each
// input's name, value, error and onChange.

export function NameFields({ field, autoFocus = false }) {
  return (
    <fieldset className="account-fieldset">
      <legend>Your name</legend>
      <div className="account-grid">
        <AccountField
          className="span-2"
          label="First name"
          autoComplete="given-name"
          autoFocus={autoFocus}
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
  );
}

export function AboutFields({ field }) {
  return (
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
  );
}

export function AddressFields({ field, autoFocus = false }) {
  return (
    <fieldset className="account-fieldset">
      <legend>Delivery address</legend>
      <div className="account-grid">
        <AccountField
          className="span-6"
          label="Street address"
          autoComplete="address-line1"
          autoFocus={autoFocus}
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
  );
}
