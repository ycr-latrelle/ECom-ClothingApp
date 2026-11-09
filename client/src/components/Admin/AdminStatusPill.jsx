import React from 'react';
import './AdminStatusPill.css';

export default function AdminStatusPill({ status }) {
  const statusMap = {
    'Verified': { bg: 'var(--admin-success)', text: 'var(--admin-success-text)' },
    'Pending': { bg: 'var(--admin-warning)', text: 'var(--admin-warning-text)' },
    'Cancelled': { bg: 'var(--admin-danger)', text: 'var(--admin-danger-text)' },
    'Processing': { bg: 'var(--admin-border)', text: 'var(--admin-text-secondary)' },
    'Shipped': { bg: 'var(--admin-success)', text: 'var(--admin-success-text)' },
    'Delivered': { bg: 'var(--admin-success)', text: 'var(--admin-success-text)' },
    'Rejected': { bg: 'var(--admin-danger)', text: 'var(--admin-danger-text)' },
    'default': { bg: 'var(--admin-border)', text: 'var(--admin-text-secondary)' },
  };

  const style = statusMap[status] || statusMap['default'];

  return (
    <span
      className="admin-status-pill"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {status}
    </span>
  );
}
