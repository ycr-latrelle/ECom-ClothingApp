import { useId } from 'react';

// A labelled input (or select, via `as="select"`) with optional hint and inline
// error, wired up for screen readers.
export default function AccountField({
  label,
  hint,
  error,
  className = '',
  as: Control = 'input',
  children,
  ...controlProps
}) {
  const id = useId();
  const describedBy =
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`account-field ${className}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <Control
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...controlProps}
      >
        {children}
      </Control>
      {hint && <p id={`${id}-hint`} className="account-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="account-error" role="alert">{error}</p>}
    </div>
  );
}
