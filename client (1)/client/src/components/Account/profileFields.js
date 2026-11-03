// Shared rules for the "About you" step of registration.
// If you change MIN_AGE or the gender values, update client/firestore.rules too.

export const MIN_AGE = 13;
export const MAX_AGE = 120;

export const GENDER_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

export const EMPTY_PROFILE = {
  firstName: '',
  middleName: '',
  lastName: '',
  age: '',
  gender: '',
  street: '',
  barangay: '',
  city: '',
  province: '',
  postalCode: '',
};

// Letters from any language (so Ñ, accents, etc. work), plus spaces, dots,
// hyphens and apostrophes for names like "Ma. Cristina" or "De la Cruz".
const NAME_PATTERN = /^\p{L}[\p{L}\p{M} .'’-]*$/u;
const POSTAL_PATTERN = /^\d{4}$/; // Philippine postal codes are 4 digits

const tidy = (value) => value.trim().replace(/\s+/g, ' ');

// Trims every field and collapses repeated spaces.
export function cleanProfile(values) {
  return Object.fromEntries(
    Object.keys(EMPTY_PROFILE).map((key) => [key, tidy(values[key] ?? '')]),
  );
}

function nameError(value, label, { required }) {
  if (!value) return required ? `Enter your ${label}.` : undefined;
  if (value.length > 60) return `Keep your ${label} under 60 characters.`;
  if (!NAME_PATTERN.test(value)) {
    return 'Use letters only. Spaces, hyphens and apostrophes are fine.';
  }
  return undefined;
}

function textError(value, label, max) {
  if (!value) return `Enter your ${label}.`;
  if (value.length > max) return `Keep this under ${max} characters.`;
  return undefined;
}

// Returns { fieldName: 'message' } - an empty object means the form is valid.
// Keys are added in on-screen order so the first invalid field can be focused.
export function validateProfile(values) {
  const v = cleanProfile(values);
  const found = {
    firstName: nameError(v.firstName, 'first name', { required: true }),
    middleName: nameError(v.middleName, 'middle name', { required: false }),
    lastName: nameError(v.lastName, 'last name', { required: true }),
    age: ageError(v.age),
    gender: GENDER_OPTIONS.some((option) => option.value === v.gender)
      ? undefined
      : 'Select an option.',
    street: textError(v.street, 'street address', 120),
    barangay: textError(v.barangay, 'barangay', 80),
    city: textError(v.city, 'city or municipality', 80),
    province: textError(v.province, 'province', 80),
    postalCode: POSTAL_PATTERN.test(v.postalCode)
      ? undefined
      : 'Enter a 4-digit postal code.',
  };

  return Object.fromEntries(Object.entries(found).filter(([, message]) => message));
}

function ageError(value) {
  if (!value) return 'Enter your age.';
  if (!/^\d{1,3}$/.test(value)) return 'Enter your age as a whole number.';

  const age = Number(value);
  if (age < MIN_AGE) return `You must be at least ${MIN_AGE} to create an account.`;
  if (age > MAX_AGE) return 'Enter a valid age.';
  return undefined;
}

// ---------- helpers for showing and editing a saved profile ----------

export function genderLabel(value) {
  return GENDER_OPTIONS.find((option) => option.value === value)?.label ?? '';
}

export function fullName(profile) {
  return [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' ');
}

export function formatAddress(address = {}) {
  const place = [address.street, address.barangay, address.city, address.province]
    .filter(Boolean)
    .join(', ');
  return [place, address.postalCode].filter(Boolean).join(' ');
}

// Turns a saved profile (as the auth context holds it) back into form values.
export function profileToValues(profile) {
  const address = profile.address ?? {};
  return {
    firstName: profile.firstName ?? '',
    middleName: profile.middleName ?? '',
    lastName: profile.lastName ?? '',
    age: String(profile.age ?? ''),
    gender: profile.gender ?? '',
    street: address.street ?? '',
    barangay: address.barangay ?? '',
    city: address.city ?? '',
    province: address.province ?? '',
    postalCode: address.postalCode ?? '',
  };
}
