
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export class AdminShipmentApiError extends Error {
  constructor(message, { status, kind } = {}) {
    super(message);
    this.name = 'AdminShipmentApiError';
    this.status = status;
    this.kind = kind;
  }
}

async function request(user, path, options = {}) {
  if (!API_BASE_URL) {
    throw new AdminShipmentApiError(
      'VITE_API_BASE_URL is missing from the client environment.',
      { kind: 'configuration' },
    );
  }

  if (!user) {
    throw new AdminShipmentApiError(
      'You must be signed in to manage shipments.',
      { kind: 'auth' },
    );
  }

  const token = await user.getIdToken();

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      cache: 'no-store',
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;

    throw new AdminShipmentApiError(
      'Could not connect to the server. Check your connection and try again.',
      { kind: 'network' },
    );
  }

  const text = await response.text();
  let result = null;

  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON response.
  }

  if (response.status === 401 || response.status === 403) {
    throw new AdminShipmentApiError(
      'You are not authorized to manage shipments.',
      { kind: 'auth', status: response.status },
    );
  }

  if (!response.ok) {
    throw new AdminShipmentApiError(
      result?.error ||
        result?.title ||
        `Shipment request failed (HTTP ${response.status}).`,
      {
        kind: response.status === 404 ? 'not-found' : 'server',
        status: response.status,
      },
    );
  }

  return result;
}

function mapShipment(item) {
  return {
    orderId: item.orderId,
    orderCode: item.orderCode,
    customerName: item.customerName,
    customerEmail: item.customerEmail,
    mobileNumber: item.mobileNumber,

    streetAddress: item.streetAddress,
    barangay: item.barangay,
    cityMunicipality: item.cityMunicipality,
    province: item.province,
    postalCode: item.postalCode,
    deliveryNotes: item.deliveryNotes,
    deliveryLatitude: item.deliveryLatitude,
    deliveryLongitude: item.deliveryLongitude,
    deliveryAccuracyMeters: item.deliveryAccuracyMeters,

    shippingFee: item.shippingFee,
    shippingFeeStatus: item.shippingFeeStatus,

    shipmentId: item.shipmentId,
    courier: item.courier,
    trackingNumber: item.trackingNumber,
    trackingUrl: item.trackingUrl,
    shipmentStatus: item.shipmentStatus || 'not_shipped',

    shippedAt: item.shippedAt,
    estimatedDeliveryAt: item.estimatedDeliveryAt,
    deliveredAt: item.deliveredAt,

    updatedBy: item.updatedBy,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function fetchAdminShipments(user) {
  const result = await request(user, '/api/admin/shipments');

  if (!Array.isArray(result)) {
    throw new AdminShipmentApiError(
      'The shipments API returned an unexpected response.',
      { kind: 'server' },
    );
  }

  return result.map(mapShipment);
}

export async function fetchAdminShipmentDetails(user, orderId) {
  const result = await request(
    user,
    `/api/admin/shipments/${encodeURIComponent(orderId)}`,
  );

  if (!result || typeof result !== 'object') {
    throw new AdminShipmentApiError(
      'The shipment details API returned an unexpected response.',
      { kind: 'server' },
    );
  }

  return {
    ...mapShipment(result),
    history: Array.isArray(result.history)
      ? result.history.map((event) => ({
          id: event.id,
          previousStatus: event.previousStatus,
          newStatus: event.newStatus,
          note: event.note,
          changedBy: event.changedBy,
          createdAt: event.createdAt,
        }))
      : [],
  };
}

export async function updateAdminShipment(user, orderId, payload) {
  return request(
    user,
    `/api/admin/shipments/${encodeURIComponent(orderId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
}

export async function updateAdminShippingFee(user, orderId, payload) {
  return request(
    user,
    `/api/admin/shipments/${encodeURIComponent(orderId)}/shipping-fee`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
}
