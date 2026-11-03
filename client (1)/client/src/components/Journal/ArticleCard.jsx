import { Link } from 'react-router-dom';
import { categories, formatDate, readingMinutes } from '../../data/journal.js';

export default function ArticleCard({ article }) {
  const { slug, title, excerpt, category, publishedAt, cover } = article;

  return (
    <article className="article-card">
      <div className="article-card-media">
        {/* Decorative here: the title link already names the story. */}
        <img src={cover.src} alt="" loading="lazy" />
      </div>
      <p className="article-card-category">{categories[category]}</p>
      <h3>
        <Link to={`/journal/${slug}`}>{title}</Link>
      </h3>
      <p className="article-card-excerpt">{excerpt}</p>
      <p className="article-card-meta">
        <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
        <span aria-hidden="true">·</span>
        <span>{readingMinutes(article)} min read</span>
      </p>
    </article>
  );
}
