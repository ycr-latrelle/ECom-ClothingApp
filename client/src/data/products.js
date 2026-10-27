export const products = [
  { id: 'essential-oversized-hoodie', name: 'Essential Oversized Hoodie', price: 1890, image: '/images/tops-image.png', status: 'ready' },
  { id: 'minimal-logo-tee', name: 'Minimal Logo Tee', price: 990, image: '/images/minimal-logo-tee-image.png', status: 'ready' },
  { id: 'wide-cargo-pants', name: 'Wide Cargo Pants', price: 1750, image: '/images/wide-cargo-pants-image.png', status: 'pre-order' },
  { id: 'nb-550-grey', name: 'NB 550 (Grey)', price: 4200, image: '/images/nb-550-image.png', status: 'ready' },
  { id: 'ny-dad-cap', name: 'NY Dad Cap', price: 890, image: '/images/NY-Dad-Cap-image.png', status: 'ready' },
];

export const formatPeso = (n) => `₱${n.toLocaleString('en-PH')}`;
