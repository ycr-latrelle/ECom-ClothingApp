// Same rules the order confirmation screen applies to receipt screenshots.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];

// Returns an error message, or '' when the file is acceptable.
export function receiptImageError(file) {
  if (!file) return 'Choose a receipt image before submitting.';
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Choose a JPEG or PNG receipt image.';
  if (file.size > MAX_IMAGE_BYTES) return 'Choose an image that is 5 MB or smaller.';
  return '';
}
