import { useId } from 'react';

// A labelled input with optional hint and inline error, wired up for screen readers.
export default function AccountField({ label, hint, error, ...inputProps }) {
  const id = useId();
  const describedBy =
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;

  return (
    <div className="account-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...inputProps}
      />
      {hint && <p id={`${id}-hint`} className="account-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="account-error" role="alert">{error}</p>}
    </div>
  );
}
