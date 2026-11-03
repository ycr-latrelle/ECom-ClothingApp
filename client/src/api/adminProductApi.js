const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? ""
).replace(/\/+$/, "");

const ADMIN_PRODUCTS_URL = `${API_BASE_URL}/api/admin/products`;

async function getAuthHeaders(user) {
  if (!API_BASE_URL) {
    throw new Error(
      "VITE_API_BASE_URL is missing from the client environment.",
    );
  }

  if (!user) {
    throw new Error("You must be signed in to manage products.");
  }

  const token = await user.getIdToken();

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse(response) {
  const responseText = await response.text();
  let result = null;

  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch {
    // The response may not contain JSON.
  }

  if (!response.ok) {
    throw new Error(
      result?.error ||
        result?.title ||
        `Request failed (HTTP ${response.status}).`,
    );
  }

  return result;
}

export async function fetchAdminProducts(user) {
  const headers = await getAuthHeaders(user);

  const response = await fetch(ADMIN_PRODUCTS_URL, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const products = await handleResponse(response);

  if (!Array.isArray(products)) {
    throw new Error("The admin products API returned an unexpected response.");
  }

  return products;
}

export async function fetchAdminProduct(user, productId) {
  const headers = await getAuthHeaders(user);

  const response = await fetch(
    `${ADMIN_PRODUCTS_URL}/${encodeURIComponent(productId)}`,
    { headers, cache: "no-store" },
  );

  return handleResponse(response);
}

export async function createAdminProduct(user, productData) {
  const headers = await getAuthHeaders(user);

  const response = await fetch(ADMIN_PRODUCTS_URL, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(productData),
  });

  return handleResponse(response);
}

export async function updateAdminProduct(user, productId, productData) {
  const headers = await getAuthHeaders(user);

  const response = await fetch(
    `${ADMIN_PRODUCTS_URL}/${encodeURIComponent(productId)}`,
    {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(productData),
    },
  );

  return handleResponse(response);
}

export async function setAdminProductStatus(user, productId, isActive) {
  const headers = await getAuthHeaders(user);

  const response = await fetch(
    `${ADMIN_PRODUCTS_URL}/${encodeURIComponent(productId)}/status`,
    {
      method: "PATCH",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isActive }),
    },
  );

  await handleResponse(response);
}

export async function deleteAdminProduct(user, productId) {
  const headers = await getAuthHeaders(user);

  const response = await fetch(
    `${ADMIN_PRODUCTS_URL}/${encodeURIComponent(productId)}`,
    {
      method: "DELETE",
      headers,
    },
  );

  await handleResponse(response);
}

export async function fetchAdminProductImages(user, productId) {
  const headers = await getAuthHeaders(user);

  const response = await fetch(
    `${ADMIN_PRODUCTS_URL}/${encodeURIComponent(productId)}/images`,
    {
      headers,
      cache: "no-store",
    },
  );

  return handleResponse(response);
}

export async function uploadAdminProductImage(user, productId, file) {
  const headers = await getAuthHeaders(user);
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    `${ADMIN_PRODUCTS_URL}/${encodeURIComponent(productId)}/images`,
    {
      method: "POST",
      headers,
      body: formData,
    },
  );

  return handleResponse(response);
}