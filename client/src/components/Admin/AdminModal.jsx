import { useEffect, useRef } from "react";
import "./AdminModal.css";

export default function AdminModal({
  isOpen,
  onClose,
  title,
  eyebrow,
  subtitle,
  size = "md",
  dialogClassName = "",
  backdropClassName = "",
  footer,
  children,
  isBusy = false,
  closeOnEscape = true,
  closeOnBackdrop = true,
}) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const isBusyRef = useRef(isBusy);

  useEffect(() => {
    onCloseRef.current = onClose;
    isBusyRef.current = isBusy;
  }, [isBusy, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && closeOnEscape && !isBusyRef.current) {
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = [...dialogRef.current.querySelectorAll(
        'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      )];
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [closeOnEscape, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`ap-modal-backdrop ${backdropClassName}`.trim()}
      onMouseDown={(event) => {
        if (
          closeOnBackdrop &&
          !isBusy &&
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        ref={dialogRef}
        className={`ap-modal ap-modal--${size} ${dialogClassName}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        aria-describedby={subtitle ? "admin-modal-subtitle" : undefined}
      >
        <header className="ap-modal-header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 id="admin-modal-title">{title}</h2>
            {subtitle && <p id="admin-modal-subtitle">{subtitle}</p>}
          </div>
          <button
            ref={closeButtonRef}
            className="ap-modal-close"
            type="button"
            onClick={() => {
              if (!isBusy) onClose();
            }}
            disabled={isBusy}
            aria-label="Close dialog"
          >
            ×
          </button>
        </header>
        <div className="ap-modal-content">{children}</div>
        {footer && (
          <footer className="ap-modal-footer" aria-busy={isBusy}>
            {footer}
          </footer>
        )}
      </section>
    </div>
  );
}