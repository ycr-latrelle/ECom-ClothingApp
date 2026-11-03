import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import FeaturedArticle from '../../components/Journal/FeaturedArticle.jsx';
import ArticleCard from '../../components/Journal/ArticleCard.jsx';
import JournalFilters from '../../components/Journal/JournalFilters.jsx';
import { aboutContent } from '../../data/aboutContent.js';
import { categories, getFeaturedArticle, getPublishedArticles, journalContent } from '../../data/journal.js';
import '../../components/Journal/Journal.css';
import './Journal.css';

const PAGE_SIZE = 6;

export default function Journal() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('category');
  const category = requested && categories[requested] ? requested : 'all';

  // "Load more" count resets automatically when the category changes.
  const [loaded, setLoaded] = useState({ category, count: PAGE_SIZE });
  const count = loaded.category === category ? loaded.count : PAGE_SIZE;

  const featured = getFeaturedArticle();
  const showFeatured = category === 'all' && featured;

  const visible = useMemo(
    () =>
      getPublishedArticles().filter((a) => {
        if (category !== 'all') return a.category === category;
        return a.slug !== featured?.slug;
      }),
    [category, featured],
  );

  const shown = visible.slice(0, count);

  const changeCategory = (value) => {
    const next = new URLSearchParams(params);
    if (value === 'all') next.delete('category');
    else next.set('category', value);
    setParams(next, { replace: true });
  };

  return (
    <main className="journal-page">
      <header className="journal-intro">
        <p className="eyebrow">{journalContent.eyebrow}</p>
        <h1>{journalContent.title}</h1>
        <p>{journalContent.intro.replace('{brand}', aboutContent.brandName)}</p>
      </header>

      {showFeatured && (
        <section className="journal-section" aria-label="Featured story">
          <FeaturedArticle article={featured} />
        </section>
      )}

      <section className="journal-section" aria-label="All stories">
        <div className="journal-toolbar">
          <JournalFilters active={category} onChange={changeCategory} />
          <span aria-live="polite">
            {visible.length} {visible.length === 1 ? 'story' : 'stories'}
          </span>
        </div>

        {visible.length === 0 ? (
          <p className="journal-empty">No stories in this category yet. Check back soon.</p>
        ) : (
          <div className="journal-grid">
            {shown.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        )}

        {shown.length < visible.length && (
          <div className="journal-more">
            <button
              type="button"
              className="journal-more-button"
              onClick={() => setLoaded({ category, count: count + PAGE_SIZE })}
            >
              Load more stories
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
