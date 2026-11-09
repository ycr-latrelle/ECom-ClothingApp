import './AdminPageHeader.css';

export default function AdminPageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="admin-page-header">
      <div className="admin-page-header-text">
        {eyebrow && <p className="admin-page-eyebrow">{eyebrow}</p>}
        <h1 className="admin-page-title">{title}</h1>
        {description && <p className="admin-page-description">{description}</p>}
      </div>
      {action && (
        <div className="admin-page-header-actions">
          {action}
        </div>
      )}
    </div>
  );
}
