import { Link } from 'react-router-dom';
import { categories, formatDate } from '../../data/journal.js';

export default function FeaturedArticle({ article }) {
  const { slug, title, excerpt, category, publishedAt, cover } = article;

  return (
    <article className="featured-article">
      <Link className="featured-article-media" to={`/journal/${slug}`} tabIndex={-1} aria-hidden="true">
        <img src={cover.src} alt="" />
      </Link>

      <div className="featured-article-copy">
        <p className="eyebrow">Featured · {categories[category]}</p>
        <h2>
          <Link to={`/journal/${slug}`}>{title}</Link>
        </h2>
        <p className="featured-article-excerpt">{excerpt}</p>
        <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
        <Link className="journal-read-link" to={`/journal/${slug}`}>
          Read story <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
