# THREAD / THEORY — Client

> **Temporary README.** Replace it once the project settles.

A streetwear storefront built with React and Vite. Customers can browse ready-stock and pre-order items, add them to a cart and read how pre-orders work. The brand name is a placeholder.

## Tech stack

- React 19
- React Router 7 (`react-router-dom`)
- Vite 8
- Plain CSS, one stylesheet per component or page
- ESLint

## Getting started

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:5173`.

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

## Routes

| Path | Page |
| --- | --- |
| `/` | Home: hero slideshow, categories, popular picks, pre-order banner |
| `/shop` | Shop with category filters and sorting (`?category=tops`, `?category=ready`, `?sort=price-asc`) |
| `/pre-order` | Shop page limited to pre-order items |
| `/about` | About: story, shopping options, pre-order steps, FAQ |

Any other path redirects to Home.

## Project structure

```
public/images/            Product and hero images
src/
  components/
    SiteHeader/           Header (transparent over the hero on Home)
    SiteFooter/           Footer
    Hero/                 Home hero slideshow
    CategoryCard/         Category tile
    ProductCard/          Product card with Add to cart
    PromoBanner/          Pre-order banner
    CartDrawer/           Slide-in cart
    About/                About page sections
  context/                Cart state (CartProvider, useCart)
  data/
    products.js           Product list and peso formatter
    aboutContent.js       All About-page copy, FAQ and links
  pages/                  Home, Shop, About
  styles/global.css       Colors, fonts and spacing tokens
```

## Editing content

- **Products:** edit `src/data/products.js`. Each item has an `id`, `name`, `price`, `image`, `category` (`tops`, `bottoms`, `footwear`, `accessories`) and `status` (`ready` or `pre-order`). Entries marked `// sample` reuse existing photos and should be replaced.
- **Images:** put files in `public/images/` and reference them as `/images/your-file.png`. Filenames are case-sensitive.
- **Hero slides:** change the `slides` array at the top of `src/components/Hero/Hero.jsx`. Hero images are transparent PNG cutouts.
- **About page:** edit `src/data/aboutContent.js`. Items with `pending: true` show a "To be confirmed" tag, so remove the flag once the policy is final. Set `preOrder.timeframe` to a sentence once delivery estimates are confirmed. The deposit percentage is `settings.depositPercent`.
- **Colors and fonts:** change the tokens at the top of `src/styles/global.css`.

## Cart

Cart state lives in `src/context/CartProvider.jsx` and is saved to `localStorage` under `thread-theory-cart`. Adding an item opens the drawer. Items are keyed by product `id`, so there are no sizes yet.

## Known placeholders and to-do

- Brand name `THREAD / THEORY` is hard-coded in the header, footer and `index.html`. The About page reads it from `aboutContent.js`.
- Checkout button in the cart drawer does nothing yet.
- No size picker and no product detail page.
- `/payment-policy` and `/shipping-policy` (linked from About) do not exist yet and redirect to Home.
- `/journal`, `/account` and `/cart` do not exist yet and redirect to Home.
- Heart (save) buttons are visual only.
- Header icons are text glyphs and should become SVGs.
- Images are large PNGs. Compress or convert to `.webp` before deploying.
- About story copy, hero intro, and the footer tagline are placeholder text.
- Delivery estimates, cancellation, refund and return rules, and shipping fees are not confirmed and are not stated anywhere on the site.
- `src/App.css` and `src/index.css` are unused Vite starter files and can be deleted.
