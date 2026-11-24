/**
 * DRIFTLINE — Global UI behaviours
 * theme · sticky header · mobile menu · scroll progress · page transitions ·
 * toasts · image loading/fallbacks · product card template · form validation
 */
import { CONFIG } from './config.js';
import { ICONS } from './icons.js';
import { imageUrl, imageSrcset, imageLqip, categoryLabel, COLORS } from './products.js';
import {
  $, $$, escapeHtml, formatPrice, onScroll, storage, trapFocus,
  lockScroll, unlockScroll, prefersReducedMotion, emit,
} from './utils.js';

const FALLBACK_IMG = 'assets/fallback.svg';

/* ==========================================================================
   Theme toggle (dark default, persisted)
   ========================================================================== */
export function initTheme() {
  const root = document.documentElement;
  const sync = () => {
    const isLight = root.dataset.theme === 'light';
    $$('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
      btn.setAttribute('aria-pressed', String(isLight));
    });
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isLight ? '#f4f1ea' : '#0b0b0c');
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme-toggle]');
    if (!btn) return;
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.classList.add('theme-switching');
    root.dataset.theme = next;
    storage.set(CONFIG.storageKeys.theme, next);
    sync();
    emit('theme:change', next);
    setTimeout(() => root.classList.remove('theme-switching'), 450);
  });
  sync();
}

/* ==========================================================================
   Sticky header: hides on scroll down, shows on scroll up, blurs when scrolled
   ========================================================================== */
export function initHeader() {
  const header = $('[data-header]');
  if (!header) return;
  let lastY = window.scrollY;

  onScroll((y) => {
    const delta = y - lastY;
    header.classList.toggle('is-scrolled', y > 20);
    if (document.body.classList.contains('menu-open')) return;
    if (Math.abs(delta) > 6) {
      header.classList.toggle('is-hidden', delta > 0 && y > 240);
      lastY = y;
    }
  });

  // Reveal the header whenever something inside it receives keyboard focus.
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
}

/* ==========================================================================
   Full-screen mobile menu (focus-trapped, Esc to close)
   ========================================================================== */
export function initMobileMenu() {
  const toggle = $('[data-menu-toggle]');
  const menu = $('[data-mobile-menu]');
  if (!toggle || !menu) return;
  let release = null;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    if (open) {
      lockScroll();
      // Focus is trapped in the menu; the toggle (now a close button) stays
      // reachable via the Shift+Tab / Tab handlers below.
      release = trapFocus(menu, { initialFocus: $('.mobile-menu__link', menu) });
    } else {
      unlockScroll();
      release?.();
      release = null;
    }
  };

  toggle.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) setOpen(false);
  });
  // Allow Shift+Tab from the first menu link back to the toggle (close button).
  menu.addEventListener('keydown', (e) => {
    const links = $$('a', menu);
    if (e.key === 'Tab' && e.shiftKey && document.activeElement === links[0]) {
      e.preventDefault();
      e.stopPropagation();
      toggle.focus();
    }
  }, true);
  toggle.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey && menu.classList.contains('is-open')) {
      e.preventDefault();
      $('a', menu)?.focus();
    }
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
    if (e.matches && menu.classList.contains('is-open')) setOpen(false);
  });
}

/* ==========================================================================
   Scroll progress bar (transform: scaleX only)
   ========================================================================== */
export function initScrollProgress() {
  const bar = $('.scroll-progress__bar');
  if (!bar) return;
  let max = 1;
  const measure = () => (max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight));
  measure();
  new ResizeObserver(measure).observe(document.body);
  onScroll((y) => {
    bar.style.transform = `scaleX(${Math.min(1, y / max)})`;
  });
}

/* ==========================================================================
   Page transitions: curtain covers the screen before navigating away
   ========================================================================== */
export function initPageTransitions() {
  const curtain = $('.page-transition');
  if (!curtain) return;

  // Restore state when returning via back/forward cache.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) curtain.classList.remove('is-leaving');
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link || e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (url.protocol !== 'http:' && url.protocol !== 'https:' && url.protocol !== 'file:') return;
    // Same-page anchors → let the browser scroll.
    const samePage = url.pathname === window.location.pathname && url.search === window.location.search;
    if (samePage && url.hash) return;

    if (prefersReducedMotion()) return;
    e.preventDefault();
    curtain.classList.add('is-leaving');
    setTimeout(() => (window.location.href = url.href), 520);
  });
}

/* ==========================================================================
   Toast notifications
   ========================================================================== */
export function toast(message, { type = 'success', action, duration = 3800 } = {}) {
  const region = $('[data-toasts]');
  if (!region) return;
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.style.setProperty('--toast-dur', `${duration}ms`);
  el.innerHTML = `
    <span class="toast__icon">${type === 'error' ? ICONS.close : type === 'info' ? ICONS.heart : ICONS.check}</span>
    <p class="toast__msg">${escapeHtml(message)}</p>
    ${action ? `<a class="toast__action" href="${action.href}">${escapeHtml(action.label)}</a>` : ''}
    <button class="toast__close" type="button" aria-label="Dismiss notification">${ICONS.close}</button>
    <span class="toast__timer" aria-hidden="true"></span>`;

  const remove = () => {
    if (el.classList.contains('is-leaving')) return;
    el.classList.add('is-leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
    setTimeout(() => el.remove(), 600); // safety if animations are disabled
  };
  el.querySelector('.toast__close').addEventListener('click', remove);
  if (action?.onClick) {
    el.querySelector('.toast__action').addEventListener('click', (e) => {
      e.preventDefault();
      action.onClick();
      remove();
    });
  }

  region.appendChild(el);
  // Keep at most 3 on screen.
  const all = $$('.toast:not(.is-leaving)', region);
  if (all.length > 3) all.slice(0, all.length - 3).forEach((t) => t.querySelector('.toast__close').click());

  let timer = setTimeout(remove, duration);
  el.addEventListener('mouseenter', () => clearTimeout(timer));
  el.addEventListener('mouseleave', () => (timer = setTimeout(remove, 1500)));
}

/* ==========================================================================
   Images: hydrate [data-img] from the registry, blur-up, fallbacks
   ========================================================================== */
function markLoaded(img) {
  img.closest('.media')?.classList.add('is-loaded');
}

function handleError(img) {
  if (img.dataset.fallback === 'done') return;
  img.dataset.fallback = 'done';
  img.removeAttribute('srcset');
  img.src = FALLBACK_IMG;
  img.closest('.media')?.classList.add('is-fallback');
}

/** Convert <img data-img="key" data-ratio="1.25" data-sizes="..."> into real responsive images. */
export function hydrateImages(root = document) {
  $$('img[data-img]', root).forEach((img) => {
    const key = img.dataset.img;
    const ratio = parseFloat(img.dataset.ratio || '0') || undefined;
    const w = parseInt(img.getAttribute('width') || '800', 10);
    img.sizes = img.dataset.sizes || '100vw';
    img.srcset = imageSrcset(key, ratio);
    img.src = imageUrl(key, w, ratio ? Math.round(w * ratio) : undefined);
    const media = img.closest('.media');
    if (media) media.style.setProperty('--lqip', `url("${imageLqip(key, ratio || 1.25)}")`);
    img.removeAttribute('data-img');
  });
}

export function initImages() {
  // load/error don't bubble, but they can be captured — one listener for every image, now and later.
  document.addEventListener('load', (e) => e.target.tagName === 'IMG' && markLoaded(e.target), true);
  document.addEventListener('error', (e) => e.target.tagName === 'IMG' && handleError(e.target), true);

  hydrateImages();
  // Images that finished (or failed) before this module ran.
  $$('img').forEach((img) => {
    if (!img.complete) return;
    if (img.naturalWidth === 0 && img.getAttribute('src')) handleError(img);
    else markLoaded(img);
  });
}

/* ==========================================================================
   Templates
   ========================================================================== */
export const starsHTML = (rating) =>
  `<span class="stars" aria-label="Rated ${rating} out of 5">${ICONS.star}<span>${rating.toFixed(1)}</span></span>`;

/** Product card used on Home, Shop and Product (related). */
export function productCardHTML(p, { index = 0, eager = false } = {}) {
  const ratio = 1.25;
  const alt = p.images[1];
  const name = escapeHtml(p.name);
  const swatches = p.colors
    .slice(0, 4)
    .map((c) => `<span class="swatch-dot" style="--swatch:${COLORS[c] || '#888'}" title="${c}"></span>`)
    .join('');

  return `
  <article class="product-card" data-id="${p.id}" style="--i:${index}">
    <a class="product-card__link" href="product.html?id=${p.id}" data-cursor="view">
      <div class="product-card__media media" style="--lqip:url('${imageLqip(p.images[0], ratio)}')">
        <img class="product-card__img" src="${imageUrl(p.images[0], 700, 875)}"
             srcset="${imageSrcset(p.images[0], ratio, [400, 700, 1000])}"
             sizes="(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 90vw"
             alt="${name}" width="700" height="875" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
        ${alt ? `<img class="product-card__img product-card__img--alt" src="${imageUrl(alt, 700, 875)}" alt="" aria-hidden="true" width="700" height="875" loading="lazy" decoding="async">` : ''}
        <span class="product-card__cta">View product ${ICONS.arrowUpRight}</span>
      </div>
      <div class="product-card__body">
        <div class="product-card__row">
          <h3 class="product-card__name">${name}</h3>
          <p class="product-card__price">${formatPrice(p.price)}</p>
        </div>
        <div class="product-card__row product-card__row--meta">
          <p class="product-card__meta">${categoryLabel(p.category)} · ${escapeHtml(p.type)}</p>
          <span class="product-card__swatches" aria-label="${p.colors.length} colour${p.colors.length > 1 ? 's' : ''}: ${p.colors.join(', ')}">${swatches}</span>
        </div>
      </div>
    </a>
    ${p.isNew ? '<span class="tag tag--new">New</span>' : ''}
    <button class="wish-btn" type="button" data-wishlist-toggle="${p.id}" aria-pressed="false" aria-label="Add ${name} to wishlist">${ICONS.heart}</button>
  </article>`;
}

export const skeletonCardHTML = () => `
  <div class="product-card product-card--skeleton" aria-hidden="true">
    <div class="skeleton skeleton--media"></div>
    <div class="skeleton skeleton--line"></div>
    <div class="skeleton skeleton--line skeleton--short"></div>
  </div>`;

/* ==========================================================================
   Back to top
   ========================================================================== */
export function initBackToTop() {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-back-to-top]')) return;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    $('.logo')?.focus({ preventScroll: true });
  });
}

/* ==========================================================================
   Form validation — inline errors, aria-invalid, no alert()
   Fields: <div class="field"><label/><input/><p class="field__error" id="ID-error"/></div>
   ========================================================================== */
const VALIDATORS = {
  required: (v, el) => {
    if (el.type === 'checkbox') return el.checked || 'Please tick this box to continue.';
    return v.trim() !== '' || `${el.dataset.label || 'This field'} is required.`;
  },
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Enter a valid email, like you@example.com.',
  phone: (v) => /^\+?[\d\s()-]{10,18}$/.test(v.trim()) || 'Enter a valid phone number (at least 10 digits).',
  minlength: (v, el) =>
    v.trim().length >= Number(el.getAttribute('minlength')) ||
    `Please enter at least ${el.getAttribute('minlength')} characters.`,
  card: (v) => {
    const digits = v.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return 'Card number should be 13–19 digits.';
    // Luhn checksum
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      let d = Number(digits[digits.length - 1 - i]);
      if (i % 2) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    return sum % 10 === 0 || 'That card number doesn’t look right. Try 4242 4242 4242 4242.';
  },
  expiry: (v) => {
    const m = v.match(/^(\d{2})\s*\/\s*(\d{2})$/);
    if (!m) return 'Use the format MM/YY.';
    const month = Number(m[1]);
    const year = 2000 + Number(m[2]);
    if (month < 1 || month > 12) return 'Month must be between 01 and 12.';
    const now = new Date();
    const end = new Date(year, month, 0, 23, 59, 59);
    return end >= now || 'This card has expired.';
  },
  cvc: (v) => /^\d{3,4}$/.test(v.trim()) || 'CVC is the 3–4 digits on the back.',
};

function fieldRules(el) {
  const rules = [];
  if (el.required) rules.push('required');
  if (el.type === 'email') rules.push('email');
  if (el.hasAttribute('minlength')) rules.push('minlength');
  if (el.dataset.validate) rules.push(...el.dataset.validate.split(' '));
  return rules;
}

export function validateField(el) {
  const value = el.value ?? '';
  const rules = fieldRules(el);
  let message = '';
  for (const rule of rules) {
    // Optional fields are only checked when filled.
    if (rule !== 'required' && !el.required && value.trim() === '') continue;
    const result = VALIDATORS[rule]?.(value, el);
    if (result !== true && result !== undefined) {
      message = result;
      break;
    }
  }
  setFieldError(el, message);
  return !message;
}

export function setFieldError(el, message) {
  const field = el.closest('.field');
  const errorEl = field?.querySelector('.field__error');
  el.setAttribute('aria-invalid', String(Boolean(message)));
  field?.classList.toggle('has-error', Boolean(message));
  field?.classList.toggle('is-valid', !message && (el.value ?? '').trim() !== '');
  if (errorEl) {
    errorEl.textContent = message;
    if (!el.getAttribute('aria-describedby')?.includes(errorEl.id)) {
      el.setAttribute('aria-describedby', `${el.getAttribute('aria-describedby') || ''} ${errorEl.id}`.trim());
    }
  }
}

/**
 * Wire up live validation for a form.
 * Validates on blur, then re-validates on input once a field has been touched.
 * @returns {() => boolean} validateAll — focuses the first invalid field.
 */
export function attachValidation(form) {
  const fields = () => $$('input, select, textarea', form).filter((el) => fieldRules(el).length);

  form.addEventListener('blur', (e) => {
    const el = e.target;
    if (!fieldRules(el).length) return;
    if ((el.value ?? '').trim() === '' && !el.dataset.touched) return; // don't shout at untouched fields
    el.dataset.touched = 'true';
    validateField(el);
  }, true);

  form.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.touched || el.getAttribute('aria-invalid') === 'true') validateField(el);
  });

  return function validateAll() {
    let firstInvalid = null;
    fields().forEach((el) => {
      el.dataset.touched = 'true';
      if (!validateField(el) && !firstInvalid) firstInvalid = el;
    });
    if (firstInvalid) {
      firstInvalid.focus();
      firstInvalid.closest('.field')?.classList.add('shake');
      setTimeout(() => firstInvalid.closest('.field')?.classList.remove('shake'), 500);
    }
    return !firstInvalid;
  };
}
