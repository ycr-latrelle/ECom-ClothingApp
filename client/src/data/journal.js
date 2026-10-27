// Journal content. Each article is shaped like the future database record, so
// the admin panel can replace this file with an API call without touching the UI.
//
// Article fields:
//   slug, title, category (a key of `categories`), excerpt, author,
//   publishedAt (YYYY-MM-DD), status ('published' | 'draft'), featured (optional),
//   cover { src, alt }, productIds (ids from products.js),
//   content: array of blocks:
//     { type: 'h2', text }  { type: 'p', text }  { type: 'list', items: [] }
//     { type: 'image', src, alt, caption? }
//
// Everything below marked PLACEHOLDER should be replaced with real stories and photos.

export const journalContent = {
  eyebrow: 'The Journal',
  title: 'Journal',
  intro:
    'Style notes, care advice and the stories behind our collections. Come here when you want to know how to wear a piece, or how to make it last.',
};

export const categories = {
  'style-notes': 'Style Notes',
  'care-guide': 'Care Guide',
  'collection-stories': 'Collection Stories',
  'shop-updates': 'Shop Updates',
};

export const articles = [
  // PLACEHOLDER articles - cover photos reuse existing product images.
  {
    slug: 'how-to-style-cargo-pants',
    title: 'How to style cargo pants without overthinking it',
    category: 'style-notes',
    excerpt:
      'Wide cargos are easy to wear once you pick one balancing piece. Three simple outfits to start from.',
    author: 'The Editors',
    publishedAt: '2026-10-20',
    status: 'published',
    featured: true,
    cover: { src: '/images/wide-cargo-pants-image.png', alt: 'Wide cargo pants laid flat' },
    productIds: ['wide-cargo-pants', 'minimal-logo-tee', 'nb-550-grey'],
    content: [
      { type: 'p', text: 'Wide cargo pants carry a lot of volume, so the rest of the outfit does the balancing. Keep that one idea in mind and the styling gets easier.' },
      { type: 'h2', text: 'Start with a fitted top' },
      { type: 'p', text: 'A plain tee gives the pants room to be the main piece. Stay with one or two colors and let the pocket details show.' },
      { type: 'h2', text: 'Add structure on top' },
      { type: 'p', text: 'If you want a heavier layer, choose a boxy hoodie or a cropped jacket. Cropped lengths stop the outfit from looking shapeless.' },
      { type: 'h2', text: 'Finish with clean footwear' },
      { type: 'list', items: ['Chunky sneakers keep the look casual.', 'Low-profile sneakers sharpen it up.', 'A dad cap ties the outfit together.'] },
    ],
  },
  {
    slug: 'washing-your-oversized-hoodie',
    title: 'Washing your oversized hoodie so it lasts',
    category: 'care-guide',
    excerpt: 'A few small habits that keep heavyweight cotton soft, shaped and the right color.',
    author: 'The Editors',
    publishedAt: '2026-10-12',
    status: 'published',
    cover: { src: '/images/tops-image.png', alt: 'Black oversized hoodie' },
    productIds: ['essential-oversized-hoodie', 'everyday-crew-hoodie'],
    content: [
      { type: 'p', text: 'Always follow the care label on your own piece. These are general habits that suit most cotton fleece.' },
      { type: 'h2', text: 'Turn it inside out' },
      { type: 'p', text: 'Washing inside out protects prints and the outer surface from rubbing against other clothes.' },
      { type: 'h2', text: 'Go gentle on heat' },
      { type: 'list', items: ['Wash in cool or lukewarm water.', 'Avoid harsh detergents and bleach.', 'Air dry flat or on a wide hanger to keep the shoulders in shape.'] },
    ],
  },
  {
    slug: 'the-everyday-essentials-edit',
    title: 'The everyday essentials edit',
    category: 'collection-stories',
    excerpt: 'Why we keep coming back to simple tees, relaxed pants and one good pair of sneakers.',
    author: 'The Editors',
    publishedAt: '2026-10-05',
    status: 'published',
    cover: { src: '/images/bottoms-image.png', alt: 'Relaxed wide pants' },
    productIds: ['minimal-logo-tee', 'relaxed-wide-pants', 'court-runner'],
    content: [
      { type: 'p', text: 'Our essentials are the pieces we reach for on repeat. This story explains how we choose them.' },
      { type: 'h2', text: 'Easy to mix' },
      { type: 'p', text: 'Every piece should work with at least three other things already in your wardrobe.' },
      { type: 'h2', text: 'Made for wearing often' },
      { type: 'p', text: 'We favor simple shapes and clean details over trends that date quickly.' },
    ],
  },
  {
    slug: 'ready-stock-or-pre-order',
    title: 'Ready stock or pre-order: which should you choose?',
    category: 'shop-updates',
    excerpt: 'A quick guide to the two ways you can shop with us, and what to expect from each.',
    author: 'The Editors',
    publishedAt: '2026-09-28',
    status: 'published',
    cover: { src: '/images/pre-order-image.png', alt: 'Pre-order pieces' },
    productIds: ['graphic-back-tee', 'wide-cargo-pants'],
    content: [
      { type: 'p', text: 'Ready stock items are on hand and available to buy now. Pre-order items are sourced for you after you order.' },
      { type: 'p', text: 'The About page explains the pre-order steps in full, including the deposit.' },
    ],
  },
  {
    slug: 'caring-for-your-sneakers',
    title: 'Caring for your sneakers between wears',
    category: 'care-guide',
    excerpt: 'Rotate, air out and clean lightly, and a pair can look good for much longer.',
    author: 'The Editors',
    publishedAt: '2026-09-18',
    status: 'published',
    cover: { src: '/images/footwear-image.png', alt: 'Pair of sneakers' },
    productIds: ['nb-550-grey', 'court-runner'],
    content: [
      { type: 'list', items: ['Rotate pairs so each one can dry out fully.', 'Wipe dirt off after wearing, before it sets.', 'Store them away from direct sunlight.'] },
    ],
  },
  {
    slug: 'building-a-look-around-a-cap',
    title: 'Building a look around a cap',
    category: 'style-notes',
    excerpt: 'Small accessories do a lot of work. Where to start with a cap and a crossbody.',
    author: 'The Editors',
    publishedAt: '2026-09-08',
    status: 'draft',
    cover: { src: '/images/accessories-image.png', alt: 'Cap and crossbody bag' },
    productIds: ['ny-dad-cap', 'cap-and-crossbody'],
    content: [{ type: 'p', text: 'Draft - not visible on the site yet.' }],
  },
];

const byNewest = (a, b) => b.publishedAt.localeCompare(a.publishedAt);

export const getPublishedArticles = () =>
  articles.filter((a) => a.status === 'published').sort(byNewest);

export const getArticleBySlug = (slug) =>
  getPublishedArticles().find((a) => a.slug === slug);

export const getFeaturedArticle = () => {
  const list = getPublishedArticles();
  return list.find((a) => a.featured) ?? list[0];
};

// Same-category stories first, then the rest by date.
export const getRelatedArticles = (article, limit = 3) =>
  getPublishedArticles()
    .filter((a) => a.slug !== article.slug)
    .sort((a, b) => Number(b.category === article.category) - Number(a.category === article.category))
    .slice(0, limit);

const wordsIn = (block) =>
  [block.text, ...(block.items ?? [])].filter(Boolean).join(' ').split(/\s+/).length;

export const readingMinutes = (article) =>
  Math.max(1, Math.round(article.content.reduce((sum, b) => sum + wordsIn(b), 0) / 200));

export const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
