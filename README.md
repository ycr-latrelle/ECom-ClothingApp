# THREAD / THEORY

A streetwear storefront for ready-stock and pre-order products. **THREAD / THEORY is a working brand name and remains a placeholder.** The application is in development; orders are currently flagged as test data.

## What is included

### Storefront

- Home, Shop, Pre-order, About, Journal, account, checkout, order confirmation, and policy screens.
- Product catalog loaded from the API and Supabase.
- Category filters, sorting, product sizes, cart drawer, and quick checkout.
- Cart saved in the browser's `localStorage`; customers can browse without signing in.
- Checkout and order placement require Firebase Authentication.
- Customer profile saved through the API to Supabase. Avatar color and symbol preferences are stored locally in that browser.
- Checkout collects the written address and a required delivery map pin. The pin uses Leaflet and OpenStreetMap tiles.
- Journal stories and some storefront content are currently held in frontend data files.

### Orders and payments

- The API calculates order totals from current database product prices. Ready-stock items are due in full; pre-order items use a 50% initial deposit, with the remaining balance due later.
- Customers submit JPEG or PNG payment screenshots (up to 5 MB) and payment details.
- Tesseract OCR screens visible receipt text. It does **not** verify that a transfer happened or that funds arrived.
- If OCR finds no receipt signals, the API rejects the submission with HTTP 422. Partial matches are sent to Telegram for review; OCR being unavailable also falls back to manual review.
- Receipt images are sent to the configured Telegram channel. Supabase stores order and payment records, screening results, image hashes, and Telegram references—not the image itself.
- Submitted payments remain pending manual verification. The store must verify the transaction against its actual wallet or bank activity.

## Current limitations

- Orders are currently inserted with `is_test = TRUE`. Do not treat this as a live production order flow until that behavior is changed.
- There is no admin dashboard yet. Product administration, inventory management, order/payment review screens, and storefront customization from an admin panel are not implemented.
- Journal content is static in `client/src/data/journal.js`; it is not yet managed through an admin interface.
- Avatar customization is saved in the current browser only, not synced across devices.
- Shipping quotations and carrier integrations (including J&T) are not implemented; shipping is handled manually.
- Payment gateway integration and automatic payment confirmation are not implemented.
- Supabase schema setup is currently managed outside this repository; database migrations are not versioned here.

## Technology

| Area | Technology |
| --- | --- |
| Client | React 19, Vite 8, React Router 7 |
| Styling | Plain CSS with shared tokens in `client/src/styles/global.css` |
| Map | Leaflet, React Leaflet, OpenStreetMap |
| Authentication | Firebase Authentication; API validates Firebase ID tokens |
| API | ASP.NET Core Web API on .NET 10 |
| Database | Supabase PostgreSQL, accessed by the API using Npgsql |
| Receipt storage | Telegram Bot API |
| Receipt screening | Tesseract OCR |
| Client hosting | Vercel |
| API hosting | Render |

## Repository layout

```text
client/
  public/images/                 Storefront and product images
  src/api/                       Client API calls
  src/components/                Reusable storefront and account components
  src/context/                   Authentication, products, cart, and UI state
  src/data/                      Static journal and About-page content
  src/pages/                     Route-level screens
  src/styles/global.css          Global colors, typography, and spacing tokens
server/
  Controllers/                   Products, profiles, orders, and payment proofs
  Data/                          PostgreSQL repositories
  Health/                        API/database health checks
  Models/                        API request and response models
  Services/                      Telegram receipt delivery and Tesseract screening
  Dockerfile                     Render container build, including Tesseract
```

## Requirements

- Node.js and npm
- .NET 10 SDK
- A Supabase project with the required `app_private` schema and tables
- A Firebase project with Email/Password sign-in enabled and a service-account key for the API
- A Telegram bot added to the payment-receipts channel
- Tesseract installed locally to run OCR during Windows development

The Render Docker image installs Tesseract and English language data. No separate OCR API key or billing account is used.

## Local development

### 1. Configure the client

Create `client/.env.local` with the Firebase web configuration and local API URL:

```dotenv
VITE_API_BASE_URL=http://localhost:5191
VITE_FIREBASE_API_KEY=your-firebase-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
```

Restart Vite after changing environment variables.

### 2. Configure the API

Provide these configuration sections to the API through local development configuration or .NET user secrets. Use your own values; do not commit credentials or service-account JSON files.

- `Firebase:ProjectId`
- `Firebase:ServiceAccountPath`
- `ConnectionStrings:Supabase`
- `Telegram:BotToken`
- `Telegram:ChatId`
- `Cors:AllowedOrigins` including `http://localhost:5173`
- `ReceiptOcr:TesseractPath`, set to the Windows executable, commonly `C:\\Program Files\\Tesseract-OCR\\tesseract.exe`

For example, the local OCR setting is:

```json
{
  "ReceiptOcr": {
    "TesseractPath": "C:\\Program Files\\Tesseract-OCR\\tesseract.exe"
  }
}
```

The Firebase service-account path is still required for Firebase Admin authentication; it is not used by Tesseract.

### 3. Start the API

In a terminal:

```powershell
cd server
dotnet restore
dotnet run
```

The HTTP launch profile listens on `http://localhost:5191`.

### 4. Start the client

In another terminal:

```powershell
cd client
npm install
npm run dev
```

Vite runs at `http://localhost:5173`.

## API routes

| Method | Route | Authentication | Purpose |
| --- | --- | --- | --- |
| GET | `/health/live` | No | API process liveness |
| GET | `/health/ready` | No | Readiness check, including a Supabase connection |
| GET | `/api/products` | No | Active products |
| GET | `/api/me/profile` | Firebase bearer token | Current customer's profile |
| PUT | `/api/me/profile` | Firebase bearer token | Create or update profile |
| POST | `/api/orders` | Firebase bearer token | Create an order |
| POST | `/api/orders/{orderId}/payment-proof` | Firebase bearer token | Screen and submit payment proof |

## Deployment

### Vercel client

- Set the project root directory to `client`.
- Build command: `npm run build`
- Output directory: `dist`
- Configure the `VITE_API_BASE_URL` and Firebase `VITE_FIREBASE_*` values in the Vercel environment settings.

### Render API

- Build using `server/Dockerfile` with the `server` directory as the Docker build context.
- Set the health check path to `/health/ready`.
- Configure the API's Firebase project ID, Firebase service-account secret file path, Supabase connection string, Telegram bot token and channel ID, and allowed Vercel origin as Render environment variables or secret files.
- Keep the Firebase service-account secret file: the API still needs it to validate Firebase users.
- No Tesseract path environment variable is required in Render; the Docker image installs Tesseract on `PATH`.

Never put Firebase service-account keys, Telegram bot tokens, or database passwords in source control or frontend variables. Only Firebase web configuration belongs in the client build.

## Product and content updates

- Product records and prices come from `app_private.products` through `GET /api/products`.
- Product image files currently live in `client/public/images/`; product records reference an image path.
- Journal articles are edited in `client/src/data/journal.js`.
- About-page and policy content is in `client/src/data/aboutContent.js`.
- Global colors and fonts are set in `client/src/styles/global.css`.

Before accepting live payments, remove the test-order flag, confirm the Supabase schema and production configuration, and test the full order and manual-verification workflow.

