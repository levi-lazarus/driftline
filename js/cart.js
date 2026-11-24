/**
 * DRIFTLINE — Cart & wishlist
 *  - cart / wishlist stores persisted in localStorage
 *  - slide-in cart drawer available on every page
 *  - animated header badges, wishlist heart toggles
 *  - fly-to-cart animation (Web Animations API)
 */
import { CONFIG } from './config.js';
import { ICONS } from './icons.js';
import { getProductById, imageUrl } from './products.js';
import {
  $, $$, escapeHtml, formatPrice, storage, emit, on,
  trapFocus, lockScroll, unlockScroll, prefersReducedMotion,
} from './utils.js';
import { toast } from './ui.js';

const MAX_QTY = 10;
const { cart: CART_KEY, wishlist: WISH_KEY, promo: PROMO_KEY } = CONFIG.storageKeys;

/* ==========================================================================
   Cart store
   ========================================================================== */
const lineKey = (id, color, size) => `${id}|${color}|${size}`;

function readCart() {
  const raw = storage.get(CART_KEY, []);
  // Drop anything that no longer exists in the catalogue.
  return Array.isArray(raw) ? raw.filter((l) => getProductById(l.id) && l.qty > 0) : [];
}

export const cart = {
  items: readCart(),

  save(reason, meta = {}) {
    storage.set(CART_KEY, this.items);
    emit('cart:change', { reason, ...meta });
  },

  add(id, { color, size, qty = 1 } = {}) {
    const product = getProductById(id);
    if (!product) return null;
    const c = color || product.colors[0];
    const s = size || product.sizes[0];
    const key = lineKey(id, c, s);
    const existing = this.items.find((l) => l.key === key);
    if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + qty);
    else this.items.push({ key, id, color: c, size: s, qty: Math.min(MAX_QTY, qty) });
    this.save('add', { key });
    return key;
  },

  update(key, qty) {
    const line = this.items.find((l) => l.key === key);
    if (!line) return;
    if (qty <= 0) return this.remove(key);
    line.qty = Math.min(MAX_QTY, qty);
    this.save('update', { key });
  },

  remove(key) {
    const line = this.items.find((l) => l.key === key);
    this.items = this.items.filter((l) => l.key !== key);
    this.save('remove', { key, line });
    return line;
  },

  restore(line) {
    if (!line) return;
    this.items.push(line);
    this.save('restore', { key: line.key });
  },

  clear() {
    this.items = [];
    this.save('clear');
  },

  count() {
    return this.items.reduce((n, l) => n + l.qty, 0);
  },

  /** Lines joined with product data. */
  detailed() {
    return this.items.map((l) => {
      const product = getProductById(l.id);
      return { ...l, product, lineTotal: product.price * l.qty };
    });
  },

  subtotal() {
    return this.detailed().reduce((sum, l) => sum + l.lineTotal, 0);
  },

  /** Full order totals including promo and shipping rules from CONFIG. */
  totals() {
    const subtotal = this.subtotal();
    const promoCode = storage.get(PROMO_KEY, null);
    const rate = (promoCode && CONFIG.promoCodes[promoCode]) || 0;
    const discount = Math.round(subtotal * rate);
    const afterDiscount = subtotal - discount;
    const shipping =
      subtotal === 0 || afterDiscount >= CONFIG.shipping.freeThreshold ? 0 : CONFIG.shipping.flatRate;
    return { subtotal, discount, promoCode: rate ? promoCode : null, shipping, total: afterDiscount + shipping };
  },
};

/* ==========================================================================
   Wishlist store
   ========================================================================== */
export const wishlist = {
  ids: new Set(storage.get(WISH_KEY, []).filter((id) => getProductById(id))),

  has(id) {
    return this.ids.has(id);
  },

  toggle(id) {
    const added = !this.ids.has(id);
    if (added) this.ids.add(id);
    else this.ids.delete(id);
    storage.set(WISH_KEY, [...this.ids]);
    emit('wishlist:change', { id, added });
    return added;
  },

  count() {
    return this.ids.size;
  },
};

/* ==========================================================================
   Header badges
   ========================================================================== */
function bump(el) {
  el.classList.remove('is-bumping');
  void el.offsetWidth; // restart animation
  el.classList.add('is-bumping');
}

function renderBadges({ animate = false } = {}) {
  const count = cart.count();
  $$('[data-cart-count]').forEach((badge) => {
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.hidden = count === 0;
    if (animate) bump(badge);
  });
  $$('[data-cart-open]').forEach((btn) =>
    btn.setAttribute('aria-label', `Open bag, ${count} item${count === 1 ? '' : 's'}`)
  );
  $$('[data-cart-count-text]').forEach((el) => (el.textContent = `(${count})`));
}

function renderWishlist({ animate = false } = {}) {
  const count = wishlist.count();
  $$('[data-wishlist-count]').forEach((badge) => {
    badge.textContent = String(count);
    badge.hidden = count === 0;
    if (animate) bump(badge);
  });
  $$('[data-wishlist-link]').forEach((a) => a.setAttribute('aria-label', `Wishlist, ${count} item${count === 1 ? '' : 's'}`));
  syncWishButtons();
}

export function syncWishButtons(root = document) {
  $$('[data-wishlist-toggle]', root).forEach((btn) => {
    const active = wishlist.has(btn.dataset.wishlistToggle);
    btn.setAttribute('aria-pressed', String(active));
    btn.classList.toggle('is-active', active);
    const name = getProductById(btn.dataset.wishlistToggle)?.name ?? 'item';
    btn.setAttribute('aria-label', `${active ? 'Remove' : 'Add'} ${name} ${active ? 'from' : 'to'} wishlist`);
  });
}

/* ==========================================================================
   Cart drawer
   ========================================================================== */
const drawerState = { open: false, release: null };

function lineTemplate(l) {
  const p = l.product;
  return `
  <li class="cart-line" data-line="${escapeHtml(l.key)}">
    <a class="cart-line__media media" href="product.html?id=${p.id}" tabindex="-1" aria-hidden="true">
      <img src="${imageUrl(p.images[0], 200, 250)}" alt="" width="100" height="125" loading="lazy" decoding="async">
    </a>
    <div class="cart-line__info">
      <a class="cart-line__name" href="product.html?id=${p.id}">${escapeHtml(p.name)}</a>
      <p class="cart-line__variant">${escapeHtml(l.color)} · ${escapeHtml(l.size)}</p>
      <div class="cart-line__bottom">
        ${stepperHTML(l)}
        <span class="cart-line__price">${formatPrice(l.lineTotal)}</span>
      </div>
    </div>
    <button class="cart-line__remove" type="button" data-remove="${escapeHtml(l.key)}" aria-label="Remove ${escapeHtml(p.name)} from bag">${ICONS.close}</button>
  </li>`;
}

export function stepperHTML(l) {
  const name = escapeHtml(l.product.name);
  return `
  <div class="stepper stepper--sm" role="group" aria-label="Quantity for ${name}">
    <button class="stepper__btn" type="button" data-qty="${escapeHtml(l.key)}" data-delta="-1" aria-label="Decrease quantity">${ICONS.minus}</button>
    <span class="stepper__value" aria-live="polite">${l.qty}</span>
    <button class="stepper__btn" type="button" data-qty="${escapeHtml(l.key)}" data-delta="1" aria-label="Increase quantity" ${l.qty >= MAX_QTY ? 'disabled' : ''}>${ICONS.plus}</button>
  </div>`;
}

function renderDrawer() {
  const list = $('[data-cart-items]');
  if (!list) return;
  const lines = cart.detailed();
  const empty = lines.length === 0;

  list.innerHTML = lines.map(lineTemplate).join('');
  $('[data-cart-empty]').hidden = !empty;
  $('[data-cart-foot]').hidden = empty;
  $('[data-cart-subtotal]').textContent = formatPrice(cart.subtotal());

  // Free shipping meter
  const subtotal = cart.subtotal();
  const remaining = Math.max(0, CONFIG.shipping.freeThreshold - subtotal);
  const pct = Math.min(1, subtotal / CONFIG.shipping.freeThreshold);
  $('[data-ship-meter]').hidden = empty;
  $('[data-ship-text]').innerHTML = remaining
    ? `You're <strong>${formatPrice(remaining)}</strong> away from free shipping.`
    : `<strong>Free shipping unlocked.</strong> Nice.`;
  $('[data-ship-bar]').style.transform = `scaleX(${pct})`;
  $('[data-ship-meter]').classList.toggle('is-complete', remaining === 0);
}

export function openDrawer() {
  const drawer = $('[data-cart-drawer]');
  const overlay = $('[data-cart-overlay]');
  if (!drawer || drawerState.open) return;
  drawerState.open = true;
  overlay.hidden = false;
  requestAnimationFrame(() => {
    overlay.classList.add('is-visible');
    drawer.classList.add('is-open');
  });
  drawer.setAttribute('aria-hidden', 'false');
  $$('[data-cart-open]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
  lockScroll();
  drawerState.release = trapFocus(drawer, { initialFocus: $('[data-cart-close]', drawer) });
}

export function closeDrawer() {
  const drawer = $('[data-cart-drawer]');
  const overlay = $('[data-cart-overlay]');
  if (!drawer || !drawerState.open) return;
  drawerState.open = false;
  drawer.classList.remove('is-open');
  overlay.classList.remove('is-visible');
  drawer.setAttribute('aria-hidden', 'true');
  $$('[data-cart-open]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  setTimeout(() => (overlay.hidden = true), 400);
  unlockScroll();
  drawerState.release?.();
}

/** Shared quantity/remove handler for any container (drawer, cart page). */
export function handleCartControls(e) {
  const qtyBtn = e.target.closest('[data-qty]');
  if (qtyBtn) {
    const line = cart.items.find((l) => l.key === qtyBtn.dataset.qty);
    if (line) cart.update(line.key, line.qty + Number(qtyBtn.dataset.delta));
    return true;
  }
  const removeBtn = e.target.closest('[data-remove]');
  if (removeBtn) {
    const removed = cart.remove(removeBtn.dataset.remove);
    if (removed) {
      const product = getProductById(removed.id);
      toast(`${product.name} removed from bag.`, {
        type: 'info',
        action: { label: 'Undo', href: '#', onClick: () => cart.restore(removed) },
      });
    }
    return true;
  }
  return false;
}

/* ==========================================================================
   Fly-to-cart animation
   ========================================================================== */
export function flyToCart(sourceEl) {
  const target = $('[data-cart-open]');
  if (!sourceEl || !target || prefersReducedMotion()) return Promise.resolve();

  const from = sourceEl.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const size = Math.min(from.width, from.height, 220);

  const ghost = document.createElement('div');
  ghost.className = 'fly-ghost';
  const img = sourceEl.tagName === 'IMG' ? sourceEl : sourceEl.querySelector('img');
  if (img) ghost.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
  Object.assign(ghost.style, {
    width: `${size}px`,
    height: `${size}px`,
    left: `${from.left + from.width / 2 - size / 2}px`,
    top: `${from.top + from.height / 2 - size / 2}px`,
  });
  document.body.appendChild(ghost);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const scale = 24 / size;

  // Arc: rise first, then swoop into the bag (transform + opacity only).
  const anim = ghost.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1, borderRadius: '16px' },
      { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 120}px) scale(0.55) rotate(-8deg)`, opacity: 1, offset: 0.4 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(10deg)`, opacity: 0.4, borderRadius: '50%' },
    ],
    { duration: 850, easing: 'cubic-bezier(0.55, 0, 0.3, 1)', fill: 'forwards' }
  );
  return anim.finished.then(() => {
    ghost.remove();
    target.classList.remove('is-receiving');
    void target.offsetWidth;
    target.classList.add('is-receiving');
  });
}

/* ==========================================================================
   Init
   ========================================================================== */
export function initCartUI() {
  renderBadges();
  renderDrawer();
  renderWishlist();

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-cart-open]')) {
      e.preventDefault();
      openDrawer();
      return;
    }
    if (e.target.closest('[data-cart-close], [data-cart-overlay]')) {
      closeDrawer();
      return;
    }
    // Drawer links navigate away — close first so the scroll lock is released.
    if (drawerState.open && e.target.closest('.cart-drawer a')) closeDrawer();

    const drawer = e.target.closest('[data-cart-drawer]');
    if (drawer) handleCartControls(e);

    const wishBtn = e.target.closest('[data-wishlist-toggle]');
    if (wishBtn) {
      e.preventDefault();
      const id = wishBtn.dataset.wishlistToggle;
      const added = wishlist.toggle(id);
      const name = getProductById(id)?.name;
      wishBtn.classList.remove('is-popping');
      void wishBtn.offsetWidth;
      if (added) wishBtn.classList.add('is-popping');
      toast(added ? `${name} saved to wishlist.` : `${name} removed from wishlist.`, {
        type: 'info',
        action: added ? { label: 'View', href: 'shop.html?view=wishlist' } : undefined,
      });
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawerState.open) closeDrawer();
  });

  on('cart:change', ({ reason }) => {
    renderBadges({ animate: reason === 'add' || reason === 'restore' });
    renderDrawer();
  });
  on('wishlist:change', () => renderWishlist({ animate: true }));

  // Keep tabs in sync.
  window.addEventListener('storage', (e) => {
    if (e.key === CART_KEY) {
      cart.items = readCart();
      emit('cart:change', { reason: 'sync' });
    }
    if (e.key === WISH_KEY) {
      wishlist.ids = new Set(storage.get(WISH_KEY, []));
      renderWishlist();
    }
  });
}

