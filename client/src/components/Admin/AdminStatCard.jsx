import './AdminStatCard.css';

export default function AdminStatCard({ label, value, description, icon }) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-card-top">
        <span className="admin-stat-label">{label}</span>
        <span className="admin-stat-icon">{icon}</span>
      </div>
      <strong className="admin-stat-value">{value}</strong>
      <p className="admin-stat-description">{description}</p>
    </div>
  );
}
