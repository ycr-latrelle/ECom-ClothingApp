// Turns Firebase Auth errors into short, plain-language messages.
// Sign-in failures deliberately don't say whether the email or the password was wrong.
const MESSAGES = {
  'auth/invalid-credential': 'That email and password don’t match. Check them and try again.',
  'auth/wrong-password': 'That email and password don’t match. Check them and try again.',
  'auth/user-not-found': 'That email and password don’t match. Check them and try again.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/missing-password': 'Enter your password.',
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
  'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes, then try again.',
  'auth/user-disabled': 'This account has been disabled. Contact the store for help.',
  'auth/network-request-failed': 'We couldn’t reach the sign-in service. Check your connection and try again.',
  'auth/operation-not-allowed': 'Email sign-in is not turned on for this store yet.',
};

export const NOT_CONFIGURED_MESSAGE =
  'Sign-in is not set up yet. Add the Firebase settings to client/.env.local and restart the dev server.';

export function friendlyAuthError(error) {
  if (error?.code && MESSAGES[error.code]) return MESSAGES[error.code];
  if (!error?.code && /not configured/i.test(error?.message ?? '')) return NOT_CONFIGURED_MESSAGE;
  return 'Something went wrong. Please try again.';
}

export const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
export const MIN_PASSWORD_LENGTH = 8;
