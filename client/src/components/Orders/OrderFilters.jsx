import { FILTERS, matchesFilter } from '../../utils/orders.js';

export default function OrderFilters({ orders, active, onChange }) {
  return (
    <div className="orders-filters" role="group" aria-label="Filter orders by status">
      {FILTERS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          aria-pressed={active === id}
          className={active === id ? 'is-active' : ''}
          onClick={() => onChange(id)}
        >
          {label}
          <span className="orders-filter-count">
            {orders.filter((order) => matchesFilter(order, id)).length}
          </span>
        </button>
      ))}
    </div>
  );
}
