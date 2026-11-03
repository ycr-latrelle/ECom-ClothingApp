# My Orders — frontend notes

Frontend-only work. No backend, database, Firebase or environment changes were made.
Route: `/account/orders` (requires sign-in; reached from the **My Orders** tab on the profile).

## API status

### Confirmed (already used by the frontend)
| Call | Used for |
| --- | --- |
| `POST /api/orders` | Creating an order. Response has `id`, `orderCode`, `orderStatus`, `paymentStatus`, `isTest`, `createdAt`, `dueToday`, `balanceLater`. |
| `POST /api/orders/{id}/payment-proof` | Submitting a receipt (`PaymentMethod`, `PaymentSourceProvider`, `SenderName`, `PaymentReferenceNumber`, `ProofImage`). Response has `paymentStatus`. |
| `GET /api/products` | Current products and sizes (used for thumbnails and reorder). |
| `GET/PUT /api/me/profile` | Customer profile. |

Known status values: payment `awaiting_submission`, `pending_verification`. Other status values below are assumptions.

### Assumed (not confirmed; the backend must provide them)
| Call | Purpose |
| --- | --- |
| `GET /api/orders` | The signed-in customer's orders (array, or `{ items \| orders \| data: [] }`). |
| `GET /api/orders/{id}` | One order with full details. |

Both send the Firebase ID token. Ownership must be enforced by the backend; the frontend never sends a customer id. If either call returns 404/405/501 the page shows "Order history isn't available yet" with the HTTP status under *Technical details*.

`src/utils/orders.js` (`normalizeOrder`) reads each field from a few likely names and leaves anything missing undefined. Check it against the real responses and adjust the alias lists.

## Missing from the API, so not implemented or only partly shown

| Missing | Effect in the UI |
| --- | --- |
| List and detail endpoints (above) | The page cannot show orders until they exist. |
| Status history / events on the order | The timeline lists only dates other fields record (placed, payment submitted, shipped, delivered) and says a full history isn't available. Nothing is invented. |
| Cancellation request endpoint | No cancel action. The drawer says online cancellation isn't available yet. Needed: an endpoint to submit a reason and read the request status. |
| Confirmation that a **rejected** payment can be resubmitted | The form is shown for `rejected` and reuses the existing payment-proof call. If the backend refuses, its error message is shown. Please confirm the behavior. |
| Shipment fields (courier, tracking number/URL, shipped date, estimate) | Shown only when present; otherwise "Tracking details haven't been provided yet". |
| Item `productId`, `size`, `quantity`, unit price and line total on orders | Needed for the card details, the Items section and reorder. Reorder is hidden when no item has a `productId`. |
| Financial fields (`subtotal`, shipping fee, discount, deposit paid, balance, `total`) | Shown only when present. Nothing is recalculated on the client. |
| Product availability / stock | Reorder checks that the product still exists and the size is still offered; it also respects `isAvailable === false`, `inStock === false` or `stock === 0` if the API ever sends them. |

## Assumptions to verify
- **Filters** map the order status by keyword (`pending/placed/awaiting…` → Pending; `process/confirm/ready/prepar…` → Processing; `ship/out_for…` → Shipped; `delivered/complete…` → Delivered; `cancel…` → Cancelled). Unrecognised values appear only under All Orders. Replace `orderBucket` with exact values once known.
- **Payment status** is shown separately from order status everywhere.

## Reuse and regressions
- Reused: `submitPaymentProof` (unchanged), the receipt rules (JPEG/PNG, 5 MB; now in `utils/receiptImage.js`), `useAuth`, `useCart().addItem/openCart`, `useProducts`, `RequireAuth` and the sign-in panel.
- Unchanged: checkout, order confirmation and its sessionStorage summary, cart, product pages.
- Small edits to existing files: `orderApi.js` (two GET functions added; `createOrder` untouched), `App.jsx` (route), `RequireAuth.jsx` (optional `reason`/`message` props), `ProfileScreen.jsx` (tab bar), `package.json` (`test` script), `README.md`.

## Checks run
- `npm run lint`: clean. `npm run build`: succeeds.
- `npm test` (Node's built-in runner): 13 unit tests for order parsing, filters, timeline, merging, tracking-link safety and reorder planning.
- The components were rendered with sample data (server-side) to check the markup for full, sparse, loading and error cases.
- **Not run:** nothing was tested in a real browser or against a real orders API, so the drawer animation, focus handling, mobile layout and live data are unverified.

## Known limitations
- No pagination yet (all orders load at once).
- The drawer's detail request runs each time it opens.
- Cancellation, event history and live data depend on the backend items above.
