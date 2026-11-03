import { useId, useState } from 'react';

// A password input with a Show / Hide button, so customers can check what they typed.
export default function PasswordField({ label, hint, error, className = '', ...inputProps }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const describedBy =
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`account-field ${className}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <div className="account-password">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...inputProps}
        />
        <button
          type="button"
          className="account-password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-controls={id}
        >
          {visible ? 'Hide' : 'Show'}
          <span className="account-sr"> password</span>
        </button>
      </div>
      {hint && <p id={`${id}-hint`} className="account-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="account-error" role="alert">{error}</p>}
    </div>
  );
}
