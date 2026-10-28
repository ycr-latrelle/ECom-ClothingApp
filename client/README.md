# THREAD / THEORY — Client

React storefront for a Philippines streetwear shop. Customers browse ready-stock and pre-order items, sign in, check out with a delivery pin, and submit GCash/Maya payment proof. The brand name is a placeholder.

## Tech stack

- React 19, React Router 7, Vite 8
- Firebase Authentication and Firestore (customer profiles)
- A separate backend API for products, orders and payment proof (`VITE_API_BASE_URL`)
- Leaflet / react-leaflet for the delivery-location map
- Plain CSS, one stylesheet per component or page
- Deployed on Vercel (`vercel.json` rewrites all paths to `index.html`)

## Getting started

```bash
npm install
npm run dev
```

Create `.env.local` in the project root (it is git-ignored):

```
VITE_API_BASE_URL=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server (`http://localhost:5173`) |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

## Routes

| Path | Page |
| --- | --- |
| `/` | Home |
| `/shop`, `/pre-order` | Shop with filters and sorting; pre-order view |
| `/about` | About, pre-order steps and FAQ |
| `/payment-policy`, `/shipping-policy` | Policy pages (confirmed facts only) |
| `/journal`, `/journal/:slug` | Journal and articles |
| `/account` | Sign in, register, profile |
| `/checkout` | Checkout (requires sign-in) |
| `/order-confirmation/:orderId` | Order summary and payment-proof upload |

`/checkout` and `/account` and `/order-confirmation/:orderId` load on demand (`React.lazy`) so the Leaflet map and forms stay out of the first download.

## How data flows

- **Products** come from `GET {API}/api/products` through `ProductsProvider`; read them with `useProducts()`.
- **Cart** lives in `CartProvider` (saved to `localStorage`). Items are keyed by product and size.
- **Orders** are created with `POST {API}/api/orders` using the signed-in user's Firebase ID token.
- **Payment proof** is uploaded to `POST {API}/api/orders/{id}/payment-proof` as a form with an image.
- **Profiles** are stored in Firestore at `users/{uid}`. `firestore.rules` lets each customer read and write only their own document. Publish the rules in the Firebase console.
- **About, policies and Journal copy** are plain data files (`src/data/aboutContent.js`, `src/data/journal.js`) shaped like future database records.

## Project structure

```
public/images/            Product, category and hero images
src/
  api/                    API and profile helpers
  components/             Header, footer, hero, cart drawer, quick checkout,
                          delivery picker, account, profile, About, Journal
  context/                Auth, cart and products providers + hooks
  data/                   aboutContent.js, journal.js, products.js (sizes, formatPeso)
  pages/                  Home, Shop, About, Policy, Journal, JournalArticle,
                          Account, Checkout, OrderConfirmation
  styles/global.css       Colors, fonts, spacing tokens
```

## Editing content

- **Journal related products:** `productIds` in `journal.js` must match the ids returned by the products API.
- **Policies and About:** edit `aboutContent.js`. Items with `pending: true` show a "To be confirmed" tag; remove the flag once the policy is final. The deposit percentage is `settings.depositPercent`.
- **Images:** files in `public/images/` are referenced as `/images/name.png`. Filenames are case-sensitive.

## To do

- Compress the large PNGs in `public/images/` (hero images are about 2 MB each).
- Confirm and publish delivery estimates, cancellation/refund/return rules and shipping fee amounts.
- Delete unused Vite starter files: `src/App.css`, `src/index.css`.
- Replace placeholder copy (About story, Journal articles) and the placeholder brand name.
