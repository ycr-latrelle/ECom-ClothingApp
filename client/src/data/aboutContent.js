// All About-page copy lives here so it can later be loaded from the admin panel.
// `pending: true` marks anything the business has not confirmed yet - it shows a
// "To be confirmed" tag. Edit the text and remove the flag once it is final.
// Use {depositPercent} anywhere you want the deposit figure inserted.

export const aboutContent = {
  // PLACEHOLDER brand name - also hard-coded in SiteHeader and SiteFooter for now.
  brandName: 'THREAD / THEORY',

  settings: {
    depositPercent: 50,
  },

  hero: {
    eyebrow: 'About us',
    title: 'Curated streetwear, ready when you are.',
    intro:
      'Browse pieces that are ready to ship, or pre-order the ones we source for you. Here is how both work, so you know what to expect before you buy.',
    image: { src: '/images/hero-image-3.png', alt: 'Model wearing a black oversized sweatshirt' },
    actions: [
      { label: 'Shop', to: '/shop', variant: 'primary' },
      { label: 'Pre-order', to: '/pre-order', variant: 'outline' },
    ],
  },

  // PLACEHOLDER story - replace with the shop's real, personal story.
  story: {
    eyebrow: 'Our story',
    title: 'Everyday pieces, picked with care',
    paragraphs: [
      'We focus on streetwear essentials for everyday wear: hoodies, tees, pants, footwear and accessories that are easy to wear on repeat.',
      'Some pieces are on hand and ready to go. Others we bring in on request through pre-orders, so you can get pieces that are not always in stock.',
    ],
    image: { src: '/images/tops-image.png', alt: 'Black oversized hoodie' },
  },

  ways: {
    eyebrow: 'Two ways to shop',
    title: 'Ready stock or pre-order',
    cards: [
      {
        id: 'ready',
        title: 'Ready stock',
        text: 'Items we already have on hand and that are available to purchase now.',
        cta: 'Shop ready stock',
        to: '/shop?category=ready',
      },
      {
        id: 'pre-order',
        title: 'Pre-order',
        text: 'Items we source from our suppliers after you place your order.',
        cta: 'View pre-orders',
        to: '/pre-order',
      },
    ],
  },

  preOrder: {
    eyebrow: 'How pre-orders work',
    title: 'Five steps from order to delivery',
    steps: [
      { title: 'Select an item', text: 'Choose a pre-order piece from the Pre-order page.' },
      { title: 'Pay the {depositPercent}% deposit', text: 'The deposit confirms your order.' },
      { title: 'We order and track it', text: 'We place the order with our supplier and track it for you.' },
      { title: 'Pay the balance', text: 'When your item arrives, pay the remaining balance and the Philippines delivery fee.' },
      { title: 'We dispatch it', text: 'Once the balance is paid, we send your item out.' },
    ],
    // Leave null until accurate estimates are settled. When set, it is shown under the steps.
    timeframe: null,
  },

  standards: {
    eyebrow: 'Selection and condition',
    title: 'What to check before you buy',
    items: [
      {
        title: 'How we select',
        text: 'We choose pieces that fit our everyday streetwear focus.',
      },
      {
        title: 'How items are checked',
        text: 'Our checking process will be described here once it is finalized.',
        pending: true,
      },
      {
        title: 'Item details',
        text: 'Each product listing is where you will find the photos, sizing and condition for that item.',
      },
    ],
    cta: { label: 'Browse listings', to: '/shop' },
  },

  payments: {
    eyebrow: 'Payments and shipping',
    title: 'Paying and getting your order',
    items: [
      { title: 'Payment', text: 'Pay by GCash or Maya QR. Payments are verified manually.' },
      { title: 'Shipping coverage', text: 'We ship within the Philippines.' },
      {
        title: 'Delivery fees',
        text: 'For pre-orders, the delivery fee is collected with the remaining balance once your item arrives.',
      },
      {
        title: 'Shipping fees',
        text: 'Shipping fee amounts will be published here once they are confirmed.',
        pending: true,
      },
    ],
    links: [
      { label: 'Payment policy', to: '/payment-policy' },
      { label: 'Shipping policy', to: '/shipping-policy' },
    ],
  },

  faq: {
    eyebrow: 'FAQ',
    title: 'Frequently asked questions',
    items: [
      {
        q: 'How does the {depositPercent}% deposit work?',
        a: 'Pre-order items need a {depositPercent}% deposit to place your order. We then place and track the order with our supplier.',
      },
      {
        q: 'When is the remaining balance due?',
        a: 'The remaining balance, plus the Philippines delivery fee, is due once your item arrives. We dispatch it after that payment.',
      },
      {
        q: 'How long do pre-orders usually take?',
        a: 'Estimated timeframes have not been published yet. They will appear here once they are confirmed.',
        pending: true,
      },
      {
        q: 'What happens if a supplier order is delayed or unavailable?',
        a: 'This policy will be confirmed and added here.',
        pending: true,
      },
      {
        q: 'Can I shop without creating an account?',
        a: 'This will be confirmed once checkout is finalized.',
        pending: true,
      },
      {
        q: 'What are the cancellation, refund, and return policies?',
        a: 'These policies will be confirmed and added here before they take effect.',
        pending: true,
      },
    ],
  },

  cta: {
    title: 'Ready to find your next piece?',
    text: 'Browse what is in stock now, or see what is open for pre-order.',
    actions: [
      { label: 'Browse ready stock', to: '/shop?category=ready', variant: 'primary' },
      { label: 'View pre-orders', to: '/pre-order', variant: 'light' },
    ],
  },
};

export const fill = (text, vars) =>
  text.replace(/\{(\w+)\}/g, (_, key) => (vars[key] ?? `{${key}}`));
