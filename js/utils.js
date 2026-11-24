/**
 * DRIFTLINE — Small shared helpers (DOM, formatting, timing, storage, a11y).
 */
import { CONFIG } from './config.js';

/* ---- DOM ------------------------------------------------------------------ */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Escape user/data strings before inserting into HTML templates. */
export function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/* ---- Formatting ----------------------------------------------------------- */
const priceFormatter = new Intl.NumberFormat(CONFIG.currency.locale, {
  style: 'currency',
  currency: CONFIG.currency.code,
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: CONFIG.currency.maximumFractionDigits,
  minimumFractionDigits: CONFIG.currency.maximumFractionDigits,
});

/** formatPrice(145000) → "₦145,000" (driven by CONFIG.currency) */
export const formatPrice = (value) => priceFormatter.format(value);

/* ---- Math ----------------------------------------------------------------- */
export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/* ---- Timing --------------------------------------------------------------- */
export function debounce(fn, wait = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * One shared, rAF-throttled scroll loop. Modules register callbacks instead of
 * adding their own scroll listeners → one read per frame, no layout thrash.
 */
const scrollCallbacks = new Set();
let scrollTicking = false;
function runScrollCallbacks() {
  const y = window.scrollY;
  scrollCallbacks.forEach((fn) => fn(y));
  scrollTicking = false;
}
window.addEventListener(
  'scroll',
  () => {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(runScrollCallbacks);
    }
  },
  { passive: true }
);
export function onScroll(fn, { immediate = true } = {}) {
  scrollCallbacks.add(fn);
  if (immediate) requestAnimationFrame(() => fn(window.scrollY));
  return () => scrollCallbacks.delete(fn);
}

/** Debounced resize subscription. */
export function onResize(fn, delay = 150) {
  const handler = debounce(fn, delay);
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}

/* ---- Environment ---------------------------------------------------------- */
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
export const prefersReducedMotion = () => motionQuery.matches;
export const isTouchDevice = () =>
  window.matchMedia('(hover: none), (pointer: coarse)').matches;
export const mq = (query) => window.matchMedia(query).matches;

/* ---- Storage (never throws: private mode / blocked storage safe) ---------- */
export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable — app keeps working in memory */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

/* ---- Events (tiny pub/sub on document) ------------------------------------ */
export const emit = (name, detail) =>
  document.dispatchEvent(new CustomEvent(name, { detail }));
export const on = (name, fn) => {
  const handler = (e) => fn(e.detail, e);
  document.addEventListener(name, handler);
  return () => document.removeEventListener(name, handler);
};

/* ---- Accessibility -------------------------------------------------------- */
const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keep keyboard focus inside `container` (dialogs, drawers, menus).
 * Returns a release() function that restores focus to the opener.
 */
export function trapFocus(container, { initialFocus } = {}) {
  const opener = document.activeElement;
  const focusables = () =>
    $$(FOCUSABLE, container).filter((el) => el.offsetParent !== null || el === document.activeElement);

  function onKeydown(e) {
    if (e.key !== 'Tab') return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  container.addEventListener('keydown', onKeydown);
  requestAnimationFrame(() => (initialFocus || focusables()[0])?.focus({ preventScroll: true }));

  return function release() {
    container.removeEventListener('keydown', onKeydown);
    if (opener && typeof opener.focus === 'function') opener.focus({ preventScroll: true });
  };
}

/** Body scroll lock that tolerates nested locks (menu + drawer, etc.). */
let lockCount = 0;
export function lockScroll() {
  lockCount += 1;
  document.body.classList.add('is-locked');
}
export function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (!lockCount) document.body.classList.remove('is-locked');
}

/* ---- URL ------------------------------------------------------------------ */
export const getParam = (name) => new URLSearchParams(window.location.search).get(name);
