import { AVATAR_COLORS, AVATAR_SYMBOLS, DEFAULT_PREFS } from '../components/Profile/avatarOptions.js';

// Profile customisation (avatar colour and symbol).
//
// These are stored in this browser only, per account. To sync them across devices,
// add avatarColor and avatarSymbol to the profile API and swap these two functions
// for calls to it; nothing else in the app needs to change.

const keyFor = (uid) => `thread-theory:profile-prefs:${uid}`;

// Only known option ids are ever accepted, whatever is in storage.
function sanitize(raw) {
  const color = AVATAR_COLORS.some((option) => option.id === raw?.avatarColor)
    ? raw.avatarColor
    : DEFAULT_PREFS.avatarColor;
  const symbol = AVATAR_SYMBOLS.some((option) => option.id === raw?.avatarSymbol)
    ? raw.avatarSymbol
    : DEFAULT_PREFS.avatarSymbol;
  return { avatarColor: color, avatarSymbol: symbol };
}

export function loadProfilePrefs(uid) {
  try {
    const stored = window.localStorage.getItem(keyFor(uid));
    return sanitize(stored ? JSON.parse(stored) : null);
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveProfilePrefs(uid, prefs) {
  try {
    window.localStorage.setItem(keyFor(uid), JSON.stringify(sanitize(prefs)));
  } catch {
    // Storage can be unavailable (private browsing, quota); the choice then lasts
    // for this visit only.
  }
}
