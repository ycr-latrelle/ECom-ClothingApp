import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/useAuth.js';
import { friendlyAuthError } from '../Account/authErrors.js';
import {
  cleanProfile,
  profileToValues,
  validateProfile,
} from '../Account/profileFields.js';

// One card on the profile screen. It shows a read-only summary until the customer
// presses Edit, then swaps to the form fields for just its own `keys`. Saving
// sends the whole profile (the API replaces it with PUT), so the other sections'
// values are carried over unchanged.
export default function ProfileSection({ title, keys, summary, renderFields }) {
  const { profile, saveProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  // Hand focus back to the Edit button when the form closes.
  const editButton = useRef(null);
  const wasEditing = useRef(false);
  useEffect(() => {
    if (wasEditing.current && !editing) editButton.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  const startEditing = () => {
    const all = profileToValues(profile);
    setValues(Object.fromEntries(keys.map((key) => [key, all[key]])));
    setErrors({});
    setFormError('');
    setNotice('');
    setEditing(true);
  };

  const field = (name) => ({
    name,
    value: values[name] ?? '',
    error: errors[name],
    onChange: (event) => {
      setValues((current) => ({ ...current, [name]: event.target.value }));
      setErrors((current) => ({ ...current, [name]: undefined }));
    },
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    const merged = { ...profileToValues(profile), ...values };
    const found = validateProfile(merged);
    const mine = Object.fromEntries(Object.entries(found).filter(([key]) => keys.includes(key)));

    setErrors(mine);
    setFormError('');

    const firstInvalid = Object.keys(mine)[0];
    if (firstInvalid) {
      form.elements.namedItem(firstInvalid)?.focus();
      return;
    }
    if (Object.keys(found).length > 0) {
      // Something in another section is invalid (for example an older record).
      setFormError('Some of your other details need fixing first. Check the other sections.');
      return;
    }

    setSaving(true);
    try {
      await saveProfile(cleanProfile(merged));
      setEditing(false);
      setNotice('Saved.');
    } catch (error) {
      console.error('Saving the customer profile failed.', error);
      setFormError(friendlyAuthError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="profile-section" aria-label={title}>
      <div className="profile-section-head">
        <h2>{title}</h2>
        {!editing && (
          <button
            ref={editButton}
            type="button"
            className="account-button is-small is-outline"
            onClick={startEditing}
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <form className="account-form" onSubmit={handleSubmit} noValidate>
          {renderFields(field)}

          {formError && <p className="account-banner is-error" role="alert">{formError}</p>}

          <div className="profile-form-actions">
            <button type="submit" className="account-button is-small" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              className="account-button is-small is-outline"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {summary}
          {notice && <p className="account-hint profile-notice" role="status">{notice}</p>}
        </>
      )}
    </section>
  );
}
