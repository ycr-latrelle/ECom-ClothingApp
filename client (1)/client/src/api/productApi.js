const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '');

export async function fetchProducts({ signal } = {}) {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is missing from the client environment.');
  }

  const response = await fetch(`${API_BASE_URL}/api/products`, { signal });

  if (!response.ok) {
    throw new Error(`Could not load products (${response.status}).`);
  }

  const products = await response.json();

  if (!Array.isArray(products)) {
    throw new Error('The products API returned an unexpected response.');
  }

  return products;
}