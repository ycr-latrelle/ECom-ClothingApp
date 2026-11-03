// Pure helpers for the My Orders screens: reading order API responses, status
// labels, filters, the timeline and reorder planning.
//
// The orders list and detail endpoints are not confirmed yet, so every field is
// read defensively and anything missing is left undefined rather than invented.
// Check the real responses against `normalizeOrder` and adjust the alias lists.

export const FILTERS = [
  { id: 'all', label: 'All Orders' },
  { id: 'pending', label: 'Pending' },
  { id: 'processing', label: 'Processing' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

/* ---------- small readers ---------- */

const present = (value) => value !== undefined && value !== null && value !== '';

const pick = (source, keys) => {
  for (const key of keys) {
    const value = source?.[key];
    if (present(value)) return value;
  }
  return undefined;
};

const toNumber = (value) => {
  if (!present(value)) return undefined;
  const number = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(number) ? number : undefined;
};

const toText = (value) => (present(value) ? String(value) : undefined);

const toArray = (value) => (Array.isArray(value) ? value : []);

/* ---------- statuses ---------- */

export const statusKey = (status) =>
  String(status ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');

const PAYMENT_LABELS = {
  awaiting_submission: 'Awaiting payment',
  pending_verification: 'Pending verification',
  verified: 'Verified',
  rejected: 'Rejected',
  refunded: 'Refunded',
};

function label(status, labels = {}) {
  const key = statusKey(status);
  if (!key) return 'Not available';
  return labels[key] ?? key.replace(/_/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase());
}

export const paymentLabel = (status) => label(status, PAYMENT_LABELS);
export const orderLabel = (status) => label(status);

// 'success' | 'warning' | 'danger' | 'neutral'
export function paymentTone(status) {
  const key = statusKey(status);
  if (['verified', 'paid', 'confirmed'].includes(key)) return 'success';
  if (['rejected', 'failed', 'declined'].includes(key)) return 'danger';
  if (['awaiting_submission', 'pending_verification', 'pending'].includes(key)) return 'warning';
  return 'neutral';
}

export function orderTone(status) {
  const bucket = orderBucket(status);
  if (bucket === 'delivered') return 'success';
  if (bucket === 'cancelled') return 'danger';
  if (bucket === 'pending') return 'warning';
  return 'neutral';
}

// Groups the backend's order status into the filter tabs. The real status values
// are not confirmed, so this matches on keywords; anything unrecognised returns
// null and only appears under "All Orders".
export function orderBucket(status) {
  const key = statusKey(status);
  if (!key) return null;

  if (key.includes('cancel')) return 'cancelled';
  if (key.includes('delivered') || key.includes('complete')) return 'delivered';
  if (key.includes('out_for') || key.includes('in_transit')) return 'shipped';
  if (key.includes('ready')) return 'processing';
  if (key.includes('ship') || key.includes('dispatch')) return 'shipped';
  if (['process', 'confirm', 'prepar', 'sourc', 'pack'].some((word) => key.includes(word))) {
    return 'processing';
  }
  // Whole words only, so a status like "something_new" is not mistaken for pending.
  const words = key.split('_');
  if (['pending', 'placed', 'new', 'awaiting', 'created', 'unpaid'].some((word) => words.includes(word))) {
    return 'pending';
  }
  return null;
}

export const matchesFilter = (order, filterId) =>
  filterId === 'all' || orderBucket(order.orderStatus) === filterId;

export function orderStats(orders) {
  const bucketCount = (bucket) => orders.filter((o) => orderBucket(o.orderStatus) === bucket).length;
  return {
    total: orders.length,
    processing: bucketCount('processing'),
    completed: bucketCount('delivered'),
  };
}

/* ---------- reading an order ---------- */

function normalizeItem(raw) {
  const product = raw?.product;
  return {
    productId: toText(pick(raw, ['productId', 'product_id']) ?? product?.id),
    name: toText(pick(raw, ['productName', 'name']) ?? product?.name),
    image: toText(pick(raw, ['imageUrl', 'image', 'productImage']) ?? product?.image),
    size: toText(pick(raw, ['size', 'selectedSize'])),
    qty: toNumber(pick(raw, ['quantity', 'qty'])),
    unitPrice: toNumber(pick(raw, ['unitPrice', 'price', 'unit_price'])),
    lineTotal: toNumber(pick(raw, ['lineTotal', 'line_total', 'total', 'subtotal'])),
  };
}

function normalizePayment(raw) {
  const payment = raw?.payment ?? raw?.latestPayment ?? toArray(raw?.payments)[0];

  const result = {
    status: toText(pick(payment, ['status', 'paymentStatus'])),
    method: toText(pick(payment, ['paymentMethod', 'method'])),
    sourceProvider: toText(pick(payment, ['paymentSourceProvider', 'sourceProvider'])),
    amount: toNumber(pick(payment, ['amount', 'paymentAmount'])),
    referenceNumber: toText(pick(payment, ['paymentReferenceNumber', 'referenceNumber'])),
    submittedAt: toText(pick(payment, ['submittedAt', 'createdAt'])),
    rejectionReason: toText(pick(payment, ['rejectionReason', 'rejectedReason', 'verificationNote'])),
  };

  return Object.values(result).some(present) ? result : null;
}

function normalizeShipment(raw) {
  const shipment = raw?.shipment ?? raw?.shipping ?? raw;

  const result = {
    courier: toText(pick(shipment, ['courier', 'courierName'])),
    trackingNumber: toText(pick(shipment, ['trackingNumber', 'tracking_number'])),
    trackingUrl: toText(pick(shipment, ['trackingUrl', 'trackingURL', 'tracking_url'])),
    shippedAt: toText(pick(shipment, ['shippedAt', 'shipmentDate', 'shippedDate'])),
    estimatedDelivery: toText(
      pick(shipment, ['estimatedDeliveryDate', 'estimatedDelivery', 'estimatedDeliveryAt']),
    ),
  };

  return Object.values(result).some(present) ? result : null;
}

function normalizeEvents(raw) {
  const list = pick(raw, ['timeline', 'events', 'statusHistory', 'history']);

  return toArray(list)
    .map((event) => ({
      key: statusKey(pick(event, ['status', 'type', 'event', 'title'])),
      title: toText(pick(event, ['title', 'label'])),
      description: toText(pick(event, ['description', 'note', 'message'])),
      at: toText(pick(event, ['createdAt', 'occurredAt', 'timestamp', 'at'])),
    }))
    .filter((event) => event.key || event.title);
}

export function normalizeOrder(raw) {
  const id = toText(pick(raw, ['id', 'orderId']));
  const items = toArray(pick(raw, ['items', 'orderItems', 'lines'])).map(normalizeItem);

  const addressParts = [
    pick(raw, ['streetAddress', 'street']),
    raw?.barangay,
    pick(raw, ['cityMunicipality', 'city']),
    raw?.province,
    raw?.postalCode,
  ].filter(present);

  const totals = {
    subtotal: toNumber(raw?.subtotal ?? raw?.totals?.subtotal),
    shippingFee: toNumber(pick(raw, ['shippingFee', 'deliveryFee', 'shipping'])),
    discount: toNumber(pick(raw, ['discount', 'discountAmount'])),
    depositPaid: toNumber(pick(raw, ['depositPaid', 'depositAmount', 'deposit'])),
    dueToday: toNumber(raw?.dueToday ?? raw?.totals?.dueToday),
    balance: toNumber(
      pick(raw, ['balanceLater', 'balanceDue', 'outstandingBalance', 'balance']) ??
        raw?.totals?.balanceLater,
    ),
    total: toNumber(pick(raw, ['total', 'totalAmount', 'grandTotal'])),
  };

  const payment = normalizePayment(raw);

  return {
    id,
    code: toText(pick(raw, ['orderCode', 'orderNumber', 'code'])) ?? id,
    createdAt: toText(pick(raw, ['createdAt', 'orderedAt', 'placedAt'])),
    deliveredAt: toText(pick(raw, ['deliveredAt', 'deliveredDate'])),
    orderStatus: toText(pick(raw, ['orderStatus', 'status'])),
    paymentStatus: toText(raw?.paymentStatus ?? payment?.status),
    isTest: raw?.isTest,
    items,
    totals,
    payment,
    shipment: normalizeShipment(raw),
    events: normalizeEvents(raw),
    delivery: {
      name: toText(pick(raw, ['customerFullName', 'customerName', 'fullName'])),
      phone: toText(pick(raw, ['mobileNumber', 'phone'])),
      address: addressParts.length > 0 ? addressParts.join(', ') : undefined,
      notes: toText(raw?.deliveryNotes),
    },
  };
}

// The list endpoint may return a bare array or wrap it.
export function extractOrderList(data) {
  if (Array.isArray(data)) return data;
  const wrapped = pick(data, ['items', 'orders', 'data']);
  return Array.isArray(wrapped) ? wrapped : null;
}

/* ---------- display helpers ---------- */

export function formatDateTime(value, { time = false } = {}) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(time ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}

// Tracking links come from the backend; only plain web links are rendered.
export function safeHttpUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

export const hasPreorderBalance = (order) =>
  typeof order.totals.balance === 'number' && order.totals.balance > 0;

/* ---------- timeline ---------- */

const byTime = (a, b) => (new Date(a.at).getTime() || 0) - (new Date(b.at).getTime() || 0);

// With a real status history from the API, show it as is. Without one, list only
// the dated moments that other fields actually record; nothing is filled in.
export function buildTimeline(order) {
  if (order.events.length > 0) {
    const events = [...order.events].sort(byTime);
    return {
      mode: 'history',
      items: events.map((event, index) => ({
        key: `${event.key}-${index}`,
        title: event.title ?? orderLabel(event.key),
        description: event.description,
        at: event.at,
        state: index === events.length - 1 ? 'current' : 'done',
      })),
    };
  }

  const recorded = [
    { key: 'placed', title: 'Order placed', at: order.createdAt },
    { key: 'payment-submitted', title: 'Payment submitted', at: order.payment?.submittedAt },
    { key: 'shipped', title: 'Shipped', at: order.shipment?.shippedAt },
    { key: 'delivered', title: 'Delivered', at: order.deliveredAt },
  ].filter((entry) => entry.at);

  return {
    mode: 'recorded',
    items: recorded.sort(byTime).map((entry) => ({ ...entry, state: 'done' })),
  };
}

/* ---------- reorder ---------- */

// Matches an old order's lines against the current catalogue. Prices come from the
// current product, never from the old order. Returns what can go in the cart and
// what cannot (with a reason).
export function planReorder(order, products, maxQty = 10) {
  const byId = new Map(products.map((product) => [String(product.id), product]));
  const add = [];
  const skipped = [];

  for (const item of order.items) {
    const product = item.productId ? byId.get(String(item.productId)) : undefined;
    const name = item.name ?? product?.name ?? 'An item';

    if (!product) {
      skipped.push({ name, reason: 'is no longer available' });
      continue;
    }

    if (product.isAvailable === false || product.inStock === false || product.stock === 0) {
      skipped.push({ name, reason: 'is out of stock' });
      continue;
    }

    const sizes = Array.isArray(product.sizes) ? product.sizes.map(String) : [];

    if (sizes.length > 0 && !(item.size && sizes.includes(String(item.size)))) {
      skipped.push({
        name,
        reason: item.size ? `is no longer available in size ${item.size}` : 'needs a size chosen',
      });
      continue;
    }

    add.push({
      product,
      size: sizes.length > 0 ? String(item.size) : null,
      qty: Math.min(maxQty, Math.max(1, item.qty ?? 1)),
    });
  }

  return { add, skipped };
}

/* ---------- combining the list entry with the loaded details ---------- */

const defined = (object) =>
  Object.fromEntries(Object.entries(object ?? {}).filter(([, value]) => present(value)));

// Detail values win; anything the detail response leaves out falls back to what
// the list already showed.
export function mergeOrder(summary, detail) {
  if (!detail) return summary;

  return {
    ...summary,
    ...defined(detail),
    // normalizeOrder falls back to the id when there is no order code; don't let
    // that fallback replace a real code the list already had.
    code: detail.code !== detail.id ? detail.code : summary.code,
    items: detail.items.length > 0 ? detail.items : summary.items,
    events: detail.events.length > 0 ? detail.events : summary.events,
    totals: { ...defined(summary.totals), ...defined(detail.totals) },
    delivery: { ...defined(summary.delivery), ...defined(detail.delivery) },
    payment: detail.payment ?? summary.payment,
    shipment: detail.shipment ?? summary.shipment,
  };
}
