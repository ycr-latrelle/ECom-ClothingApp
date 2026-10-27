import { Link } from 'react-router-dom';
import './CategoryCard.css';

export default function CategoryCard({ name, image, to }) {
  return (
    <Link className="category-card" to={to}>
      <img src={image} alt="" loading="lazy" />
      <span>
        {name}
        <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}