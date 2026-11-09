import { useEffect } from "react";
import "./AdminModal.css";

export default function AdminModal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = "md",
  footer,
  children,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="ap-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`ap-modal ${size === "md" ? "ap-product-detail" : ""} ${size === "lg" ? "ap-form-modal" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
      >
        <header className="ap-modal-header">
          <div>
            <h2 id="admin-modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="ap-modal-close" type="button" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </header>
        <div className="ap-modal-content">{children}</div>
        {footer && <footer className="ap-modal-footer">{footer}</footer>}
      </section>
    </div>
  );
}