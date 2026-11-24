/**
 * DRIFTLINE — Entry point (loaded on every page as an ES module)
 * 1. Render shared layout  2. Boot global UI  3. Lazy-load the page module
 */
import { renderLayout } from './layout.js';
import {
  initTheme, initHeader, initMobileMenu, initScrollProgress,
  initPageTransitions, initImages, initBackToTop,
} from './ui.js';
import { initCursor } from './cursor.js';
import { initReveal, initParallax, initMagnetic } from './animations.js';
import { initCartUI } from './cart.js';

const page = document.body.dataset.page || 'home';

// Page-specific modules are loaded on demand (code-splitting without a bundler).
const PAGE_MODULES = {
  home: () => import('./home.js'),
  shop: () => import('./shop.js'),
  product: () => import('./product.js'),
  cart: () => import('./cart-page.js'),
  contact: () => import('./contact.js'),
};

async function boot() {
  window.__driftlineReady = true; // tells theme-init.js the module graph loaded
  renderLayout(page);

  initTheme();
  initImages();
  initHeader();
  initMobileMenu();
  initScrollProgress();
  initPageTransitions();
  initBackToTop();
  initCartUI();
  initCursor();

  // Page module first (it may render content), then global motion systems.
  try {
    const mod = await PAGE_MODULES[page]?.();
    await mod?.init?.();
  } catch (err) {
    console.error(`[driftline] Failed to initialise "${page}" page`, err);
  }

  initReveal();
  initParallax();
  initMagnetic();

  // The home page waits for its preloader before flagging ready.
  if (page !== 'home') document.documentElement.classList.add('is-ready');
}

boot();
