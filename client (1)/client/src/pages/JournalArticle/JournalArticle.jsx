import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import ArticleCard from '../../components/Journal/ArticleCard.jsx';
import ProductCard from '../../components/ProductCard/ProductCard.jsx';
import { aboutContent } from '../../data/aboutContent.js';
import {
  categories,
  formatDate,
  getArticleBySlug,
  getRelatedArticles,
  readingMinutes,
} from '../../data/journal.js';
import { useProducts } from '../../context/useProducts.js';
import './JournalArticle.css';

function Block({ block }) {
  switch (block.type) {
    case 'h2':
      return <h2>{block.text}</h2>;
    case 'p':
      return <p>{block.text}</p>;
    case 'list':
      return (
        <ul>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case 'image':
      return (
        <figure>
          <img src={block.src} alt={block.alt} loading="lazy" />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );
    default:
      return null;
  }
}

export default function JournalArticle() {
  const { slug } = useParams();
  const article = getArticleBySlug(slug);
  const { products } = useProducts();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [slug]);

  useEffect(() => {
    if (!article) return undefined;
    const previous = document.title;
    document.title = `${article.title} | ${aboutContent.brandName}`;
    return () => {
      document.title = previous;
    };
  }, [article]);

  if (!article) {
    return (
      <main className="article-page article-missing">
        <h1>Story not found</h1>
        <p>This story may have been moved or is not published yet.</p>
        <Link className="article-back" to="/journal">
          <span aria-hidden="true">←</span> Back to Journal
        </Link>
      </main>
    );
  }

  const { title, category, author, publishedAt, cover, content, productIds } = article;
  const related = getRelatedArticles(article);
  // productIds in journal.js must match the ids returned by the products API.
  const relatedProducts = productIds
    .map((id) => products.find((p) => String(p.id) === String(id)))
    .filter(Boolean);

  return (
    <main className="article-page">
      <article>
        <header className="article-header">
          <Link className="article-back" to="/journal">
            <span aria-hidden="true">←</span> Back to Journal
          </Link>
          <p className="article-category">
            <Link to={`/journal?category=${category}`}>{categories[category]}</Link>
          </p>
          <h1>{title}</h1>
          <p className="article-meta">
            <span>By {author}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
            <span aria-hidden="true">·</span>
            <span>{readingMinutes(article)} min read</span>
          </p>
        </header>

        <figure className="article-cover">
          <img src={cover.src} alt={cover.alt} />
        </figure>

        <div className="article-body">
          {content.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>
      </article>

      {relatedProducts.length > 0 && (
        <section className="article-section" aria-labelledby="article-products">
          <div className="article-section-heading">
            <h2 id="article-products">Shop this story</h2>
            <Link to="/shop">View all <span aria-hidden="true">→</span></Link>
          </div>
          <div className="article-products">
            {relatedProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="article-section" aria-labelledby="article-related">
          <div className="article-section-heading">
            <h2 id="article-related">More from the Journal</h2>
            <Link to="/journal">All stories <span aria-hidden="true">→</span></Link>
          </div>
          <div className="article-related">
            {related.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
