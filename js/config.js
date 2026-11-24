/**
 * DRIFTLINE — Site configuration
 * One place to change brand name, currency, shipping rules and the next drop.
 */
export const CONFIG = {
  brand: {
    name: 'DRIFTLINE',
    tagline: 'Move different.',
    email: 'hello@driftline.example',
    phone: '+234 800 000 0000',
  },

  /**
   * Currency used by formatPrice(). Product prices in products.js are stored
   * in this currency. To switch to e.g. US dollars: { code: 'USD', locale: 'en-US' }
   * and update the prices.
   */
  currency: {
    code: 'NGN',
    locale: 'en-NG',
    maximumFractionDigits: 0,
  },

  shipping: {
    flatRate: 5000,         // charged when below the threshold
    freeThreshold: 150000,  // free shipping at or above this subtotal
  },

  /** Promo codes → fractional discount */
  promoCodes: {
    DRIFT10: 0.1,
    MOVEDIFFERENT: 0.15,
  },

  /** Countdown target for the "New Drop" section. Rolls forward if it has passed. */
  newDrop: {
    name: 'DRIFT/08 — Afterglow',
    date: '2026-12-12T18:00:00+01:00',
    rollEveryDays: 14,
  },

  storageKeys: {
    cart: 'driftline-cart',
    wishlist: 'driftline-wishlist',
    theme: 'driftline-theme',
    promo: 'driftline-promo',
    preloaded: 'driftline-preloaded',
  },
};
