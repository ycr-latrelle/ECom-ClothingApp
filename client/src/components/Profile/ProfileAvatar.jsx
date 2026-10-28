import { AVATAR_COLORS, AVATAR_SYMBOLS } from './avatarOptions.js';

// A round avatar: the chosen colour with either the first letter of the name
// or the chosen symbol. Purely decorative, so hidden from screen readers.
export default function ProfileAvatar({ name, prefs, size = 88 }) {
  const color = AVATAR_COLORS.find((option) => option.id === prefs.avatarColor) ?? AVATAR_COLORS[0];
  const symbol = AVATAR_SYMBOLS.find((option) => option.id === prefs.avatarSymbol);
  const initial = ([...(name || '').trim()][0] ?? '?').toUpperCase();

  return (
    <span
      className="profile-avatar"
      aria-hidden="true"
      style={{ '--avatar-bg': color.value, '--avatar-size': `${size}px` }}
    >
      {symbol?.char ?? initial}
    </span>
  );
}
