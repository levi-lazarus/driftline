# DRIFTLINE — *Move different.*

A portfolio-grade streetwear e-commerce concept built with **only HTML, CSS and vanilla JavaScript**: no frameworks, no UI libraries, no build step.

DRIFTLINE is a fictional Lagos-born label selling sneakers, clothing and accessories. The site covers the whole shopping journey: an animated home page, a filterable shop, product pages, a persistent cart with checkout, and brand and contact pages. Every interaction is hand-written with modern browser APIs.

> ⚠️ Concept project. No real orders or payments are processed.

---

## ✨ Features

### Home page (each section has its own signature animation)
| # | Section | Technique |
|---|---------|-----------|
| 1 | **Preloader** | Logo letters slide up through a clipping mask while a counter runs to 100; the curtain lifts once the page has loaded (shown once per session). |
| 2 | **Hero** | Per-letter staggered headline; floating product card with mouse parallax and 3D tilt (rAF + lerp); "different." inverts over the photo via `mix-blend-mode: difference`; rotating SVG `textPath` "Shop now" badge; infinite marquee. |
| 3 | **Categories** | Cards wipe open with a `clip-path` reveal; image zoom on hover; the custom cursor turns into a **VIEW** label. |
| 4 | **Featured** | Pinned horizontal scroll: the section sticks while cards slide sideways as you scroll down. Includes a live counter and progress bar. On small screens and with reduced motion it falls back to native swipe with scroll-snap. |
| 5 | **Brand statement** | Words fill with colour one by one, driven by scroll position. Beside them, a **3D Volt Runner** spins a full turn and drifts down as you scroll. It's drawn by a hand-written WebGL2 renderer (`js/shoe3d.js`: GLB parser, PBR-style shader, normal mapping without stored tangents) and is lazy-loaded when the section is near. It shows a static pose with reduced motion and hides itself if WebGL2 is unavailable. |
| 6 | **Stats** | Count-up (easeOutExpo) the first time the stats scroll into view. |
| 7 | **New-drop countdown** | Flip-clock digits with a real 3D leaf rotation (`rotateX` + `backface-visibility`). The target date rolls forward automatically so the timer never sits at zero. |
| 8 | **Lookbook** | Mask reveal with image settle; three columns move at different parallax speeds. |
| 9 | **Testimonials** | Auto-sliding carousel with pointer drag/swipe (rubber-band edges), arrows, dots, keyboard support and pause on hover/focus. |
| 10 | **Newsletter** | Inline validation; the button morphs from arrow → spinner → animated check; success state. |
| 11 | **Footer** | Oversized wordmark with a staggered letter wave on hover, social links and back-to-top. |

### Global
- Custom cursor (dot + lagging ring) that grows over interactive elements and shows contextual labels (View / Drag / Zoom / Shop). Disabled on touch devices and with reduced motion.
- Reusable scroll-reveal system using `IntersectionObserver` with utility attributes: `fade-up`, `clip`, `mask`, `scale`, `stagger`, `split`.
- Sticky header that hides on scroll down, reappears on scroll up and blurs its background once you scroll.
- Full-screen mobile menu with staggered links, focus trap and Esc to close.
- Page-transition curtain between pages (restored correctly from the back/forward cache).
- Scroll progress bar (transform-only).
- Dark theme by default, light/dark toggle saved in `localStorage`, applied before first paint so there's no flash.

### E-commerce
- **27 products** across Shoes, Clothing and Accessories in `js/products.js`.
- **Shop page:** filter by category, size, colour, price range (dual-thumb slider), new arrivals and wishlist; sort by featured, newest, popular, price or rating; live debounced search. Filter state is synced to the URL so results can be shared. Skeleton loaders, removable active-filter chips, and a **FLIP-animated grid** where cards glide to their new positions on every change.
- **Product page** (`product.html?id=dl-001`): gallery with thumbnails, keyboard arrow navigation and cursor-follow hover zoom; colour and size selectors with inline validation; quantity stepper; live price total; **fly-to-cart** arc animation (Web Animations API); wishlist; details accordion; related products; 404 state for unknown IDs.
- **Cart:** slide-in drawer available on every page plus a full cart page; add/remove/update quantity with undo; animated badge; free-shipping progress meter; promo codes (`DRIFT10`, `MOVEDIFFERENT`); persisted in `localStorage` and synced across tabs.
- **Checkout:** a three-step form with inline errors (no `alert()`), `aria-invalid` and `aria-describedby`, card/expiry input masks, a Luhn check, an expiry-date check, and a success modal with a **canvas confetti** burst.
- **Wishlist:** heart toggle on every card and product page, persisted, with a filterable wishlist view.
- **Toasts** for every user action (with Undo / View actions).
- **Currency helper:** `formatPrice()` uses `Intl.NumberFormat`. Change the currency in one place in `js/config.js` (default ₦ NGN).

---

## 🛠 Tech used
- **HTML5:** semantic landmarks, native `<details>`, `<dialog>`-style ARIA patterns, `<output>`, fieldsets/legends.
- **CSS3:** custom properties, `clamp()` fluid type, Grid/Flexbox, container query units (`cqi`), `:has()`, `color-mix()`, `mix-blend-mode`, 3D transforms, `prefers-reduced-motion`, `prefers-color-scheme`-ready tokens.
- **JavaScript (ES2022 modules):** `IntersectionObserver`, `MutationObserver`, `ResizeObserver`, `requestAnimationFrame`, Web Animations API, Pointer Events, Canvas 2D, `Intl.NumberFormat`, `localStorage`/`sessionStorage`, `history.replaceState`, dynamic `import()`.
- **Fonts:** [Unbounded](https://fonts.google.com/specimen/Unbounded) (display) and [Inter](https://fonts.google.com/specimen/Inter) (body) via Google Fonts.
- **Images:** [Unsplash](https://unsplash.com), served from its CDN with responsive `srcset`.
- **3D model:** `assets/models/volt-runner.glb` (1.25 MB), adapted from Khronos' glTF sample shoe (see Credits).

No libraries, no bundler, no dependencies.

---

## 🚀 How to run

The JavaScript uses **ES modules**, and browsers block modules on `file://` URLs. Serve the folder with any static server.

**npm (recommended, no install needed)**
```bash
cd driftline
npm run start
```
Then open the URL it prints, usually **http://localhost:3000**. If that port is busy, it automatically uses the next free one (3001, 3002, …). To pick a port: `PORT=4000 npm run start`. Stop it with **Ctrl+C**.

`scripts/dev-server.js` is a tiny static server built only from Node's standard library (Node 18+), so there are no dependencies to install.

**Alternatives**
- VS Code: install the *Live Server* extension → right-click `index.html` → **Open with Live Server**.
- Python: `python3 -m http.server 8000` → http://localhost:8000

If you double-click `index.html`, the page still shows its content (a safety net disables hidden reveal states), and a banner explains that cart, filters and animations need a local server.

---

## 📁 Folder structure

```
driftline/
├── index.html          Home
├── shop.html           Product listing + filters
├── product.html        Product detail (?id=dl-001 … dl-027)
├── cart.html           Cart, checkout, success modal
├── about.html          Brand story
├── contact.html        Contact form + FAQ
├── README.md
├── package.json        `npm run start` script (local dev only)
├── vercel.json         Static deployment config
├── scripts/
│   └── dev-server.js   Zero-dependency local dev server
├── assets/
│   ├── favicon.svg
│   ├── logo.svg
│   └── fallback.svg    Shown if any image fails to load
├── css/
│   ├── variables.css   Design tokens: colours, fonts, spacing, motion, z-index
│   ├── base.css        Reset, typography, layout primitives, utilities
│   ├── components.css  Header, menu, buttons, cards, drawer, toasts, cursor, forms, modal, footer
│   ├── animations.css  Keyframes, reveal utilities, reduced-motion overrides
│   └── pages.css       Page-specific styles (home, shop, product, cart, about, contact)
└── js/
    ├── theme-init.js   Tiny render-blocking script: theme before paint, JS flag, file:// notice
    ├── main.js         Entry point: renders layout, boots global UI, lazy-loads the page module
    ├── config.js       Brand, currency, shipping, promo codes, next-drop date, storage keys
    ├── utils.js        DOM helpers, formatPrice, debounce, shared rAF scroll loop, storage, focus trap
    ├── icons.js        Inline SVG icon set
    ├── layout.js       Shared header, mobile menu, cart drawer and footer templates
    ├── ui.js           Theme, header, menu, progress, transitions, toasts, images, card template, validation
    ├── cursor.js       Custom cursor
    ├── animations.js   Reveal system, text splitting, parallax, magnetic buttons, count-up, confetti
    ├── products.js     IMAGE registry + product catalogue + query helpers
    ├── cart.js         Cart & wishlist stores, drawer, badges, fly-to-cart
    ├── home.js         Home page sections
    ├── shop.js         Filters, sort, search, FLIP grid
    ├── product.js      Product detail page
    ├── cart-page.js    Cart page, promo codes, checkout, success modal
    └── contact.js      Contact form
```

---

## 🎨 Customisation

| What | Where |
|------|-------|
| **Colours** | `css/variables.css`: change `--c-ink`, `--c-paper`, `--c-accent` and `--c-muted`. The light theme lives in the `[data-theme="light"]` block. `--accent-text` is a darker accent used for text on light backgrounds (keeps AA contrast). |
| **Fonts** | Update the Google Fonts `<link>` in each HTML `<head>`, then `--font-display` / `--font-body` in `variables.css`. |
| **Brand name & tagline** | `js/config.js` → `brand`. The header, footer wordmark and mobile menu read it automatically. Also update the `<title>`/meta tags, the preloader letters in `index.html`, `.page-transition__word` in each page and `assets/logo.svg`. |
| **Currency** | `js/config.js` → `currency: { code: 'USD', locale: 'en-US' }`. Prices in `products.js` are stored in that currency. |
| **Shipping & promo codes** | `js/config.js` → `shipping`, `promoCodes`. |
| **Next-drop countdown** | `js/config.js` → `newDrop.date` (rolls forward every `rollEveryDays`). |
| **Images** | `js/products.js` → `IMAGES`. Each entry is an Unsplash photo ID (the part after `photo-`). Change it once and every page updates. |
| **Products** | `js/products.js` → `PRODUCTS`. A gallery image can be a key (`'voltRunner'`) or a detail crop (`{ key: 'voltRunner', zoom: 2, x: 0.6, y: 0.55 }`). |
| **Animation speed** | `--ease-*` and `--dur-*` tokens in `variables.css`. Marquee speed: `.marquee__track` in `pages.css`. Carousel autoplay: `AUTOPLAY_MS` in `home.js`. |

---

## ♿ Accessibility
- Semantic landmarks, skip link, one `h1` per page, labelled forms, fieldsets with legends.
- Visible `:focus-visible` rings everywhere. Keyboard-operable menu, drawer, filters, carousel (arrow keys) and gallery (arrow keys).
- Focus is trapped inside the menu, cart drawer, mobile filters and modal, and restored to the opener on close. Esc closes them.
- Split-text animations keep a visually hidden copy of the text for screen readers; decorative layers are `aria-hidden`.
- Live regions for result counts, toasts and form errors (`role="alert"`). The countdown announces at most once per minute.
- `prefers-reduced-motion` disables the preloader timing, parallax, tilt, cursor, marquee, carousel autoplay, pinning and page curtains, while all content stays visible.

## ⚡ Performance
- Only `transform` and `opacity` are animated in loops; the one-shot `clip-path` reveals are the only exception.
- One shared, rAF-throttled scroll loop (`onScroll`) instead of many listeners. Parallax only updates elements that are on screen (tracked with `IntersectionObserver`).
- Resize handlers are debounced; the cursor's rAF loop stops when idle.
- Responsive `srcset`/`sizes`, `loading="lazy"`, `decoding="async"`, explicit `width`/`height` (no layout shift), blur-up placeholders and shimmer skeletons.
- Page modules are loaded with dynamic `import()`, so each page only downloads the code it needs.

---

## 🧠 What I learned / technical highlights

- **FLIP animations without a library.** The shop grid records every card's position, re-orders the real DOM nodes, then plays the inverted transform back with the Web Animations API. Exiting cards are frozen as absolutely positioned ghosts so the remaining cards can reflow underneath them, and I handled the edge case of a card returning mid-exit.
- **Scroll-linked motion that stays at 60fps.** Pinned horizontal scrolling, word-by-word colour fill and multi-speed parallax all run through one `requestAnimationFrame` scroll loop. Layout is read once per frame and never written in between, which avoids layout thrashing.
- **A real 3D flip clock.** Each digit is built from four half-cards and a rotating leaf that uses `transform-origin`, `preserve-3d` and `backface-visibility`.
- **Stacking contexts matter.** The hero's `mix-blend-mode: difference` only worked after I removed a `z-index` that was isolating the headline from the image behind it.
- **Accessible motion.** Split text, carousels, drawers and modals all keep screen-reader semantics and keyboard support, and a reduced-motion user still gets the full site.
- **State without a framework.** Small observable stores for the cart and wishlist broadcast `CustomEvent`s, persist to `localStorage`, and sync across tabs with the `storage` event. The shop's filter state round-trips through the URL.
- **Resilience.** Images fall back to a branded SVG on error, storage access never throws (private mode), unknown product IDs show a 404 state, and a timeout reveals content if the modules can't load.
- **Design tokens.** A single `variables.css` drives both themes, so a full re-brand is a handful of edits.

---

## 📸 Credits
Photography from [Unsplash](https://unsplash.com) under the Unsplash License. Some product photos show third-party brand logos and are used only as placeholders for this non-commercial concept. Swap them in `js/products.js` before any commercial use.

3D sneaker: ["MaterialsVariantsShoe"](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/MaterialsVariantsShoe) © 2020 Shopify Inc., licensed under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/). Modified: a single colourway kept and recoloured to DRIFTLINE lime, textures resized from 2048px to 1024px.
