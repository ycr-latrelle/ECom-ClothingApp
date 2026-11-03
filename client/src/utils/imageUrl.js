const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

// The API returns uploaded product images as root-relative paths such as
// /api/products/<id>/images/primary. In the browser a root-relative path is
// resolved against the page's own origin (the Vite / Vercel host), not the API,
// so those requests never reach the backend. This points them at the API.
//
// Static files served by the client itself (/images/...), absolute URLs and
// data/blob URLs are returned unchanged. The stored value is never modified, so
// carts and order lines keep the host-independent path.
export function resolveImageUrl(src) {
  if (!src || typeof src !== 'string') return '';

  if (/^(https?:|data:|blob:)/i.test(src)) return src;

  if (/^\/?api\//i.test(src)) {
    return `${API_BASE_URL}/${src.replace(/^\/+/, '')}`;
  }

  return src;
}
