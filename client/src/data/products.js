// category: 'tops' | 'bottoms' | 'footwear' | 'accessories'
// status:   'ready' | 'pre-order'
// Entries marked "sample" reuse existing photos so the Shop page has enough
// items to filter - replace them with real products and images.
export const products = [
  { id: 'essential-oversized-hoodie', name: 'Essential Oversized Hoodie', price: 1890, image: '/images/tops-image.png', category: 'tops', status: 'ready' },
  { id: 'minimal-logo-tee', name: 'Minimal Logo Tee', price: 990, image: '/images/minimal-logo-tee-image.png', category: 'tops', status: 'ready' },
  { id: 'wide-cargo-pants', name: 'Wide Cargo Pants', price: 1750, image: '/images/wide-cargo-pants-image.png', category: 'bottoms', status: 'pre-order' },
  { id: 'nb-550-grey', name: 'NB 550 (Grey)', price: 4200, image: '/images/nb-550-image.png', category: 'footwear', status: 'ready' },
  { id: 'ny-dad-cap', name: 'NY Dad Cap', price: 890, image: '/images/NY-Dad-Cap-image.png', category: 'accessories', status: 'ready' },

  // sample
  { id: 'relaxed-wide-pants', name: 'Relaxed Wide Pants', price: 1590, image: '/images/bottoms-image.png', category: 'bottoms', status: 'ready' },
  { id: 'court-runner', name: 'Court Runner Sneaker', price: 3600, image: '/images/footwear-image.png', category: 'footwear', status: 'ready' },
  { id: 'cap-and-crossbody', name: 'Cap & Crossbody Set', price: 1990, image: '/images/accessories-image.png', category: 'accessories', status: 'ready' },
  { id: 'graphic-back-tee', name: 'Graphic Back Print Tee', price: 1190, image: '/images/pre-order-image.png', category: 'tops', status: 'pre-order' },
  { id: 'everyday-crew-hoodie', name: 'Everyday Crew Hoodie', price: 1690, image: '/images/tops-image.png', category: 'tops', status: 'ready' },
];

export const formatPeso = (n) => `₱${n.toLocaleString('en-PH')}`;
