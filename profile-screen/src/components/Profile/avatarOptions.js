// Avatar choices. Every colour keeps white text above a 4.5:1 contrast ratio.
export const AVATAR_COLORS = [
  { id: 'navy', label: 'Navy', value: '#172a39' },
  { id: 'coral', label: 'Coral', value: '#d93a22' },
  { id: 'teal', label: 'Teal', value: '#1d6b66' },
  { id: 'plum', label: 'Plum', value: '#6a2c5d' },
  { id: 'cobalt', label: 'Cobalt', value: '#2f4fc9' },
  { id: 'forest', label: 'Forest', value: '#2f6b3a' },
  { id: 'charcoal', label: 'Charcoal', value: '#2a2f35' },
];

// 'initial' shows the first letter of the customer's name instead of an icon.
export const AVATAR_SYMBOLS = [
  { id: 'initial', label: 'Initial', char: null },
  { id: 'cap', label: 'Cap', char: '🧢' },
  { id: 'sneaker', label: 'Sneaker', char: '👟' },
  { id: 'jacket', label: 'Jacket', char: '🧥' },
  { id: 'skateboard', label: 'Skateboard', char: '🛹' },
  { id: 'headphones', label: 'Headphones', char: '🎧' },
  { id: 'fire', label: 'Fire', char: '🔥' },
  { id: 'star', label: 'Star', char: '⭐' },
  { id: 'heart', label: 'Heart', char: '🖤' },
];

export const DEFAULT_PREFS = { avatarColor: 'navy', avatarSymbol: 'initial' };
