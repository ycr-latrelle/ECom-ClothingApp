
import { Link } from 'react-router-dom';

export default function AdminModule({ title, description }) {
  return (
    <section className="admin-module-placeholder">
      <p className="eyebrow">STORE MANAGEMENT</p>

      <h1>{title}</h1>

      <p className="admin-page-description">
        {description}
      </p>

      <div className="admin-module-notice">
        <span className="admin-module-notice-icon">◷</span>

        <div>
          <strong>Module not connected yet</strong>
          <p>
            This section will be implemented after its backend
            API, database operations, and authorization rules
            are ready.
          </p>
        </div>
      </div>

      <Link to="/admin" className="admin-module-back">
        ← Return to overview
      </Link>
    </section>
  );
}
