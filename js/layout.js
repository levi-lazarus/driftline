/**
 * DRIFTLINE — Shared layout (header, mobile menu, cart drawer, footer, cursor).
 * Rendered once per page from a single template so every page stays in sync.
 */
import { CONFIG } from './config.js';
import { ICONS } from './icons.js';

const NAV = [
  { label: 'Shop all', href: 'shop.html', page: 'shop' },
  { label: 'Shoes', href: 'shop.html?category=shoes' },
  { label: 'Clothing', href: 'shop.html?category=clothing' },
  { label: 'Accessories', href: 'shop.html?category=accessories' },
  { label: 'About', href: 'about.html', page: 'about' },
  { label: 'Contact', href: 'contact.html', page: 'contact' },
];

const SOCIALS = [
  { label: 'Instagram', icon: 'instagram', href: 'https://instagram.com' },
  { label: 'X (Twitter)', icon: 'x', href: 'https://x.com' },
  { label: 'TikTok', icon: 'tiktok', href: 'https://tiktok.com' },
  { label: 'YouTube', icon: 'youtube', href: 'https://youtube.com' },
];

const logoMark = `
  <svg class="logo__mark" viewBox="0 0 40 40" width="34" height="34" aria-hidden="true" focusable="false">
    <rect width="40" height="40" rx="10" fill="var(--accent)"/>
    <path d="M11 29 22 11M18 29l11-18" stroke="var(--on-accent)" stroke-width="4.5" stroke-linecap="round"/>
  </svg>`;

const socialLinks = (cls) =>
  SOCIALS.map(
    (s) => `<li><a class="${cls}" href="${s.href}" target="_blank" rel="noopener noreferrer" aria-label="${s.label} (opens in new tab)">${ICONS[s.icon]}</a></li>`
  ).join('');

function headerTemplate(page) {
  const links = NAV.map((item) => {
    const current = item.page && item.page === page && !window.location.search.includes('category=');
    return `<li><a class="nav__link" href="${item.href}"${current ? ' aria-current="page"' : ''}><span data-text="${item.label}">${item.label}</span></a></li>`;
  }).join('');

  return `
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="scroll-progress" aria-hidden="true"><span class="scroll-progress__bar"></span></div>

  <header class="site-header" data-header>
    <div class="container site-header__inner">
      <a class="logo" href="index.html" aria-label="${CONFIG.brand.name} — home">
        ${logoMark}
        <span class="logo__word">${CONFIG.brand.name}</span>
      </a>

      <nav class="nav" aria-label="Primary">
        <ul class="nav__list" role="list">${links}</ul>
      </nav>

      <div class="site-header__actions">
        <a class="icon-btn hide-sm" href="shop.html?focus=search" aria-label="Search products">${ICONS.search}</a>
        <button class="icon-btn" type="button" data-theme-toggle aria-label="Switch to light theme">
          <span class="theme-icon theme-icon--sun">${ICONS.sun}</span>
          <span class="theme-icon theme-icon--moon">${ICONS.moon}</span>
        </button>
        <a class="icon-btn hide-sm" href="shop.html?view=wishlist" data-wishlist-link aria-label="Wishlist">
          ${ICONS.heart}<span class="badge" data-wishlist-count hidden>0</span>
        </a>
        <button class="icon-btn" type="button" data-cart-open aria-controls="cart-drawer" aria-expanded="false" aria-label="Open bag">
          ${ICONS.bag}<span class="badge" data-cart-count hidden>0</span>
        </button>
        <button class="menu-toggle" type="button" data-menu-toggle aria-controls="mobile-menu" aria-expanded="false" aria-label="Open menu">
          <span class="menu-toggle__line"></span><span class="menu-toggle__line"></span>
        </button>
      </div>
    </div>
  </header>

  <div class="mobile-menu" id="mobile-menu" role="dialog" aria-modal="true" aria-label="Site menu" data-mobile-menu>
    <div class="mobile-menu__bg" aria-hidden="true"></div>
    <nav class="mobile-menu__nav container" aria-label="Mobile">
      <ul class="mobile-menu__list" role="list">
        ${NAV.map(
          (item, i) => `
          <li class="mobile-menu__item" style="--i:${i}">
            <a class="mobile-menu__link" href="${item.href}">
              <span class="mobile-menu__index">0${i + 1}</span>${item.label}
            </a>
          </li>`
        ).join('')}
        <li class="mobile-menu__item" style="--i:${NAV.length}">
          <a class="mobile-menu__link mobile-menu__link--sm" href="shop.html?view=wishlist"><span class="mobile-menu__index">♥</span>Wishlist</a>
        </li>
      </ul>
      <div class="mobile-menu__footer" style="--i:${NAV.length + 1}">
        <a href="mailto:${CONFIG.brand.email}">${CONFIG.brand.email}</a>
        <ul class="socials" role="list">${socialLinks('social-link')}</ul>
      </div>
    </nav>
  </div>

  <div class="drawer-overlay" data-cart-overlay hidden></div>
  <aside class="cart-drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title" data-cart-drawer aria-hidden="true">
    <header class="cart-drawer__head">
      <h2 class="cart-drawer__title" id="cart-drawer-title">Your bag <span class="cart-drawer__count" data-cart-count-text>(0)</span></h2>
      <button class="icon-btn" type="button" data-cart-close aria-label="Close bag">${ICONS.close}</button>
    </header>
    <div class="ship-meter" data-ship-meter>
      <p class="ship-meter__text" data-ship-text></p>
      <div class="ship-meter__track"><span class="ship-meter__bar" data-ship-bar></span></div>
    </div>
    <div class="cart-drawer__body">
      <ul class="cart-drawer__items" role="list" data-cart-items></ul>
      <div class="cart-empty" data-cart-empty hidden>
        <div class="cart-empty__icon">${ICONS.bag}</div>
        <p class="cart-empty__title">Your bag is empty.</p>
        <p class="cart-empty__text">Fresh drops are waiting. Go find your next favourite.</p>
        <a class="btn btn--accent" href="shop.html">Start shopping</a>
      </div>
    </div>
    <footer class="cart-drawer__foot" data-cart-foot>
      <div class="cart-drawer__row"><span>Subtotal</span><strong data-cart-subtotal>—</strong></div>
      <p class="cart-drawer__note">Shipping & discounts calculated at checkout.</p>
      <div class="cart-drawer__btns">
        <a class="btn btn--ghost" href="cart.html">View bag</a>
        <a class="btn btn--accent" href="cart.html#checkout">Checkout</a>
      </div>
    </footer>
  </aside>

  <div class="toasts" data-toasts role="region" aria-label="Notifications"></div>
  <div class="cursor" aria-hidden="true" data-cursor-root>
    <div class="cursor__ring"><span class="cursor__label" data-cursor-label></span></div>
    <div class="cursor__dot"></div>
  </div>`;
}

function footerTemplate() {
  const year = new Date().getFullYear();
  const word = CONFIG.brand.name
    .split('')
    .map((ch, i) => `<span class="wordmark__letter" style="--i:${i}">${ch}</span>`)
    .join('');

  return `
  <footer class="site-footer">
    <div class="container site-footer__top">
      <div class="site-footer__brand">
        <a class="logo" href="index.html" aria-label="${CONFIG.brand.name} — home">${logoMark}<span class="logo__word">${CONFIG.brand.name}</span></a>
        <p class="site-footer__tagline">${CONFIG.brand.tagline}</p>
        <p class="site-footer__blurb">Sneakers, streetwear and accessories designed in Lagos, worn worldwide.</p>
      </div>
      <nav class="site-footer__nav" aria-label="Footer">
        <div class="site-footer__col">
          <h2 class="site-footer__heading">Shop</h2>
          <ul role="list">
            <li><a href="shop.html?category=shoes">Shoes</a></li>
            <li><a href="shop.html?category=clothing">Clothing</a></li>
            <li><a href="shop.html?category=accessories">Accessories</a></li>
            <li><a href="shop.html?sort=newest">New arrivals</a></li>
          </ul>
        </div>
        <div class="site-footer__col">
          <h2 class="site-footer__heading">Company</h2>
          <ul role="list">
            <li><a href="about.html">Our story</a></li>
            <li><a href="index.html#lookbook">Lookbook</a></li>
            <li><a href="contact.html">Contact</a></li>
          </ul>
        </div>
        <div class="site-footer__col">
          <h2 class="site-footer__heading">Help</h2>
          <ul role="list">
            <li><a href="contact.html#faq">Shipping</a></li>
            <li><a href="contact.html#faq">Returns</a></li>
            <li><a href="cart.html">Your bag</a></li>
          </ul>
        </div>
      </nav>
      <div class="site-footer__social">
        <h2 class="site-footer__heading">Follow the drift</h2>
        <ul class="socials" role="list">${socialLinks('social-link')}</ul>
      </div>
    </div>

    <a class="wordmark" href="index.html" aria-label="${CONFIG.brand.name} — back to home">
      <span class="wordmark__inner" aria-hidden="true">${word}</span>
    </a>

    <div class="container site-footer__bottom">
      <p>© ${year} ${CONFIG.brand.name}. A portfolio concept — no real orders are processed.</p>
      <button class="back-to-top" type="button" data-back-to-top>
        Back to top <span class="back-to-top__icon">${ICONS.arrowUp}</span>
      </button>
    </div>
  </footer>`;
}

/** Inject shared chrome. `#main` must exist in the page. */
export function renderLayout(page) {
  document.body.insertAdjacentHTML('afterbegin', headerTemplate(page));
  document.body.insertAdjacentHTML('beforeend', footerTemplate());
}
