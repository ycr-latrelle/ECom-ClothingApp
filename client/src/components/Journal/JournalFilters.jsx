import { categories } from '../../data/journal.js';

const FILTERS = [['all', 'All'], ...Object.entries(categories)];

export default function JournalFilters({ active, onChange }) {
  return (
    <div className="journal-filters" role="group" aria-label="Filter stories by category">
      {FILTERS.map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={active === value}
          className={active === value ? 'is-active' : ''}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
