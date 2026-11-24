/**
 * DRIFTLINE — Shop page
 * Filters (category, size, colour, price, new, wishlist), sort, live search,
 * URL-synced state, skeleton loading and FLIP-animated grid re-layout.
 */
import { PRODUCTS, CATEGORIES, COLORS, SIZES, categoryLabel } from './products.js';
import { productCardHTML, skeletonCardHTML } from './ui.js';
import { wishlist, syncWishButtons } from './cart.js';
import {
  $, $$, debounce, escapeHtml, formatPrice, on, wait, mq,
  prefersReducedMotion, trapFocus, lockScroll, unlockScroll,
} from './utils.js';

/* ==========================================================================
   State
   ========================================================================== */
const PRICE_STEP = 5000;
const PRICE_CEIL = Math.ceil(Math.max(...PRODUCTS.map((p) => p.price)) / PRICE_STEP) * PRICE_STEP;
const ALL_SIZES = [...SIZES.shoes, ...SIZES.apparel, ...SIZES.one];
const ALL_COLORS = Object.keys(COLORS).filter((c) => PRODUCTS.some((p) => p.colors.includes(c)));

const state = {
  categories: new Set(),
  sizes: new Set(),
  colors: new Set(),
  min: 0,
  max: PRICE_CEIL,
  q: '',
  sort: 'featured',
  newOnly: false,
  wishlistOnly: false,
};

const SORTERS = {
  featured: (a, b) => Number(b.featured) - Number(a.featured) || b.popularity - a.popularity,
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  popular: (a, b) => b.popularity - a.popularity,
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
};

const els = {};

/* ==========================================================================
   URL <-> state
   ========================================================================== */
function readUrl() {
  const params = new URLSearchParams(window.location.search);
  const list = (key) => (params.get(key) || '').split(',').map((s) => s.trim()).filter(Boolean);
  list('category').forEach((c) => CATEGORIES.some((x) => x.id === c) && state.categories.add(c));
  list('size').forEach((s) => ALL_SIZES.includes(s) && state.sizes.add(s));
  list('color').forEach((c) => ALL_COLORS.includes(c) && state.colors.add(c));
  const min = Number(params.get('min'));
  const max = Number(params.get('max'));
  if (Number.isFinite(min) && min > 0) state.min = Math.min(min, PRICE_CEIL);
  if (Number.isFinite(max) && max > 0) state.max = Math.min(max, PRICE_CEIL);
  if (state.min > state.max) [state.min, state.max] = [state.max, state.min];
  state.q = params.get('q') || '';
  if (SORTERS[params.get('sort')]) state.sort = params.get('sort');
  state.wishlistOnly = params.get('view') === 'wishlist';
  state.newOnly = params.get('new') === '1';
}

function writeUrl() {
  const params = new URLSearchParams();
  if (state.categories.size) params.set('category', [...state.categories].join(','));
  if (state.sizes.size) params.set('size', [...state.sizes].join(','));
  if (state.colors.size) params.set('color', [...state.colors].join(','));
  if (state.min > 0) params.set('min', state.min);
  if (state.max < PRICE_CEIL) params.set('max', state.max);
  if (state.q) params.set('q', state.q);
  if (state.sort !== 'featured') params.set('sort', state.sort);
  if (state.newOnly) params.set('new', '1');
  if (state.wishlistOnly) params.set('view', 'wishlist');
  const qs = params.toString();
  history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}

/* ==========================================================================
   Filtering
   ========================================================================== */
function matchesSearch(p, q) {
  if (!q) return true;
  const haystack = [p.name, p.type, p.category, categoryLabel(p.category), ...p.tags, ...p.colors]
    .join(' ')
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

function getResults() {
  return PRODUCTS.filter(
    (p) =>
      (!state.categories.size || state.categories.has(p.category)) &&
      (!state.sizes.size || p.sizes.some((s) => state.sizes.has(s))) &&
      (!state.colors.size || p.colors.some((c) => state.colors.has(c))) &&
      p.price >= state.min &&
      p.price <= state.max &&
      (!state.newOnly || p.isNew) &&
      (!state.wishlistOnly || wishlist.has(p.id)) &&
      matchesSearch(p, state.q)
  ).sort(SORTERS[state.sort]);
}

const activeCount = () =>
  state.categories.size +
  state.sizes.size +
  state.colors.size +
  (state.min > 0 || state.max < PRICE_CEIL ? 1 : 0) +
  (state.newOnly ? 1 : 0) +
  (state.wishlistOnly ? 1 : 0);

/* ==========================================================================
   Filter controls
   ========================================================================== */
function buildControls() {
  els.category.innerHTML = CATEGORIES.map(
    (c) => `
    <label class="chip">
      <input type="checkbox" name="category" value="${c.id}">
      <span class="chip__face">${c.label} <span class="chip__count">${PRODUCTS.filter((p) => p.category === c.id).length}</span></span>
    </label>`
  ).join('');

  els.size.innerHTML = ALL_SIZES.map(
    (s) => `
    <label class="chip chip--size">
      <input type="checkbox" name="size" value="${s}">
      <span class="chip__face">${s}</span>
    </label>`
  ).join('');

  els.color.innerHTML = ALL_COLORS.map(
    (c) => `
    <label class="swatch" title="${c}">
      <input type="checkbox" name="color" value="${c}">
      <span class="swatch__dot" style="--swatch:${COLORS[c]}"></span>
      <span class="visually-hidden">${c}</span>
    </label>`
  ).join('');

  [els.priceMin, els.priceMax].forEach((input) => {
    input.min = 0;
    input.max = PRICE_CEIL;
    input.step = PRICE_STEP;
  });
}

/** Push state into the controls (initial load, chip removal, clear all). */
function syncControls() {
  $$('input[name="category"]', els.form).forEach((i) => (i.checked = state.categories.has(i.value)));
  $$('input[name="size"]', els.form).forEach((i) => (i.checked = state.sizes.has(i.value)));
  $$('input[name="color"]', els.form).forEach((i) => (i.checked = state.colors.has(i.value)));
  els.priceMin.value = state.min;
  els.priceMax.value = state.max;
  els.newOnly.checked = state.newOnly;
  els.wishlistOnly.checked = state.wishlistOnly;
  els.search.value = state.q;
  els.searchClear.hidden = !state.q;
  els.sort.value = state.sort;
  paintPrice();
}

function paintPrice() {
  const from = (state.min / PRICE_CEIL) * 100;
  const to = (state.max / PRICE_CEIL) * 100;
  els.priceFill.style.left = `${from}%`;
  els.priceFill.style.right = `${100 - to}%`;
  els.priceOutMin.textContent = formatPrice(state.min);
  els.priceOutMax.textContent = formatPrice(state.max);
  els.priceMin.setAttribute('aria-valuetext', formatPrice(state.min));
  els.priceMax.setAttribute('aria-valuetext', formatPrice(state.max));
}

function renderActiveFilters() {
  const chips = [];
  state.categories.forEach((c) => chips.push({ label: categoryLabel(c), type: 'categories', value: c }));
  state.sizes.forEach((s) => chips.push({ label: `Size ${s}`, type: 'sizes', value: s }));
  state.colors.forEach((c) => chips.push({ label: c, type: 'colors', value: c }));
  if (state.min > 0 || state.max < PRICE_CEIL)
    chips.push({ label: `${formatPrice(state.min)} – ${formatPrice(state.max)}`, type: 'price' });
  if (state.newOnly) chips.push({ label: 'New arrivals', type: 'newOnly' });
  if (state.wishlistOnly) chips.push({ label: 'Wishlist', type: 'wishlistOnly' });
  if (state.q) chips.push({ label: `“${state.q}”`, type: 'q' });

  els.active.innerHTML = chips.length
    ? chips
        .map(
          (c) => `<button class="active-chip" type="button" data-remove-type="${c.type}" data-remove-value="${escapeHtml(c.value || '')}" aria-label="Remove filter: ${escapeHtml(c.label)}">${escapeHtml(c.label)}<span aria-hidden="true">×</span></button>`
        )
        .join('') + `<button class="active-chip active-chip--clear" type="button" data-filters-clear>Clear all</button>`
    : '';

  const n = activeCount();
  els.filterCount.textContent = String(n);
  els.filterCount.hidden = n === 0;
}

function updateHeading() {
  const cats = [...state.categories];
  let title = 'Shop all';
  let lead = 'Every drop, every lane. Filter by what moves you.';
  if (state.wishlistOnly) {
    title = 'Your wishlist';
    lead = 'Everything you’ve hearted, in one place.';
  } else if (cats.length === 1) {
    const c = CATEGORIES.find((x) => x.id === cats[0]);
    title = c.label;
    lead = `${c.blurb}. Designed in Lagos.`;
  } else if (state.newOnly || state.sort === 'newest') {
    title = 'New arrivals';
    lead = 'Fresh off the line. Get them before they drift away.';
  }
  els.title.textContent = title;
  els.lead.textContent = lead;
  els.crumb.textContent = title;
  document.title = `${title} — DRIFTLINE`;
}

/* ==========================================================================
   Grid rendering with FLIP animation
   First → Last → Invert → Play, using the Web Animations API (transform/opacity).
   ========================================================================== */
const cardCache = new Map();

function cardFor(product, index) {
  if (!cardCache.has(product.id)) {
    const tpl = document.createElement('template');
    tpl.innerHTML = productCardHTML(product, { index, eager: index < 4 }).trim();
    cardCache.set(product.id, tpl.content.firstElementChild);
  }
  return cardCache.get(product.id);
}

function resetCard(el) {
  el.classList.remove('is-exiting');
  el.removeAttribute('style');
}

function renderGrid({ animate = true } = {}) {
  const grid = els.grid;
  const results = getResults();
  const reduce = prefersReducedMotion() || !animate;

  // FIRST: where every visible card is now.
  const first = new Map();
  $$('.product-card[data-id]', grid).forEach((el) => first.set(el.dataset.id, el.getBoundingClientRect()));
  const gridRect = grid.getBoundingClientRect();
  const nextIds = new Set(results.map((p) => p.id));

  // Exiting cards: freeze them as absolutely-positioned ghosts and fade them out.
  $$('.product-card[data-id]', grid).forEach((el) => {
    if (nextIds.has(el.dataset.id) || el.classList.contains('is-exiting')) return;
    if (reduce) {
      el.remove();
      return;
    }
    const r = first.get(el.dataset.id);
    el.classList.add('is-exiting');
    Object.assign(el.style, {
      position: 'absolute',
      top: `${r.top - gridRect.top}px`,
      left: `${r.left - gridRect.left}px`,
      width: `${r.width}px`,
    });
    el.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.85)' }], {
      duration: 300,
      easing: 'ease-in',
      fill: 'forwards',
    }).finished
      .then(() => {
        if (!el.classList.contains('is-exiting')) return; // re-added mid-exit
        el.remove();
        resetCard(el);
      })
      .catch(() => {}); // cancelled because the card came back
  });

  // A card that was fading out but matches again: cancel the exit.
  results.forEach((p) => {
    const el = cardCache.get(p.id);
    if (el?.classList.contains('is-exiting')) {
      el.getAnimations().forEach((a) => a.cancel());
      resetCard(el);
      first.delete(p.id); // animate it in fresh
    }
  });

  // Skeletons out, cards in (re-using nodes so FLIP can track them).
  $$('.product-card--skeleton', grid).forEach((s) => s.remove());
  const exiting = $$('.is-exiting', grid);
  results.forEach((p, i) => {
    const el = cardFor(p, i);
    grid.insertBefore(el, exiting[0] || null);
  });
  syncWishButtons(grid);

  // LAST + INVERT + PLAY
  if (!reduce) {
    results.forEach((p, i) => {
      const el = cardCache.get(p.id);
      const before = first.get(p.id);
      if (before) {
        const after = el.getBoundingClientRect();
        const dx = before.left - after.left;
        const dy = before.top - after.top;
        if (dx || dy) {
          el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], {
            duration: 600,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          });
        }
      } else {
        el.animate(
          [
            { opacity: 0, transform: 'translateY(30px) scale(0.94)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 600, delay: Math.min(i, 8) * 45, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' }
        );
      }
    });
  }

  // Count, empty state, chips, heading
  const total = PRODUCTS.length;
  els.count.textContent =
    results.length === total
      ? `${total} products`
      : `${results.length} of ${total} product${total === 1 ? '' : 's'}`;
  els.empty.hidden = results.length > 0;
  if (!results.length) {
    const wishEmpty = state.wishlistOnly && wishlist.count() === 0;
    els.emptyTitle.textContent = wishEmpty ? 'Your wishlist is empty.' : 'Nothing matches… yet.';
    els.emptyText.textContent = wishEmpty
      ? 'Tap the heart on any product to save it here.'
      : 'Try removing a filter or searching for something else.';
  }
  renderActiveFilters();
  updateHeading();
  writeUrl();
}

function showSkeletons(n = 8) {
  els.grid.innerHTML = Array.from({ length: n }, skeletonCardHTML).join('');
}

/* ==========================================================================
   Mobile filter panel
   ========================================================================== */
let releaseFilters = null;
function openFilters() {
  if (mq('(min-width: 1024px)')) return;
  els.filters.classList.add('is-open');
  els.overlay.hidden = false;
  requestAnimationFrame(() => els.overlay.classList.add('is-visible'));
  els.openBtn.setAttribute('aria-expanded', 'true');
  lockScroll();
  releaseFilters = trapFocus(els.filters);
}
function closeFilters() {
  if (!els.filters.classList.contains('is-open')) return;
  els.filters.classList.remove('is-open');
  els.overlay.classList.remove('is-visible');
  setTimeout(() => (els.overlay.hidden = true), 350);
  els.openBtn.setAttribute('aria-expanded', 'false');
  unlockScroll();
  releaseFilters?.();
}

/* ==========================================================================
   Init
   ========================================================================== */
export async function init() {
  Object.assign(els, {
    grid: $('[data-product-grid]'),
    form: $('[data-filter-form]'),
    category: $('[data-filter-category]'),
    size: $('[data-filter-size]'),
    color: $('[data-filter-color]'),
    priceMin: $('[data-price-min]'),
    priceMax: $('[data-price-max]'),
    priceFill: $('[data-price-fill]'),
    priceOutMin: $('[data-price-output-min]'),
    priceOutMax: $('[data-price-output-max]'),
    newOnly: $('[data-filter-new]'),
    wishlistOnly: $('[data-filter-wishlist]'),
    search: $('[data-search]'),
    searchClear: $('[data-search-clear]'),
    sort: $('[data-sort]'),
    count: $('[data-result-count]'),
    active: $('[data-active-filters]'),
    empty: $('[data-shop-empty]'),
    emptyTitle: $('[data-empty-title]'),
    emptyText: $('[data-empty-text]'),
    filterCount: $('[data-filter-count]'),
    filters: $('[data-filters]'),
    overlay: $('[data-filters-overlay]'),
    openBtn: $('[data-filters-open]'),
    title: $('[data-shop-title]'),
    lead: $('[data-shop-lead]'),
    crumb: $('[data-shop-crumb]'),
  });

  readUrl();
  buildControls();
  syncControls();
  updateHeading();

  // Skeleton "fetch" so the loading state is visible and the layout never jumps.
  showSkeletons();
  if (new URLSearchParams(window.location.search).get('focus') === 'search') {
    els.search.focus({ preventScroll: false });
  }
  await wait(prefersReducedMotion() ? 0 : 650);
  renderGrid({ animate: true });

  /* ---- Events ---- */
  els.form.addEventListener('change', (e) => {
    const t = e.target;
    const setFor = { category: state.categories, size: state.sizes, color: state.colors }[t.name];
    if (setFor) t.checked ? setFor.add(t.value) : setFor.delete(t.value);
    if (t === els.newOnly) state.newOnly = t.checked;
    if (t === els.wishlistOnly) state.wishlistOnly = t.checked;
    if (t === els.priceMin || t === els.priceMax) return; // handled on input
    renderGrid();
  });

  // Price: paint live while dragging, filter once the value settles.
  const commitPrice = debounce(() => renderGrid(), 180);
  [els.priceMin, els.priceMax].forEach((input) =>
    input.addEventListener('input', () => {
      let min = Number(els.priceMin.value);
      let max = Number(els.priceMax.value);
      if (min > max - PRICE_STEP) {
        if (input === els.priceMin) min = max - PRICE_STEP;
        else max = min + PRICE_STEP;
        els.priceMin.value = min;
        els.priceMax.value = max;
      }
      state.min = Math.max(0, min);
      state.max = Math.min(PRICE_CEIL, max);
      paintPrice();
      commitPrice();
    })
  );

  const runSearch = debounce(() => renderGrid(), 220);
  els.search.addEventListener('input', () => {
    state.q = els.search.value.trim();
    els.searchClear.hidden = !els.search.value;
    runSearch();
  });
  els.search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && els.search.value) {
      e.stopPropagation();
      els.searchClear.click();
    }
  });
  els.searchClear.addEventListener('click', () => {
    els.search.value = '';
    state.q = '';
    els.searchClear.hidden = true;
    els.search.focus();
    renderGrid();
  });

  els.sort.addEventListener('change', () => {
    state.sort = els.sort.value;
    renderGrid();
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-filters-clear]')) {
      Object.assign(state, { min: 0, max: PRICE_CEIL, q: '', newOnly: false, wishlistOnly: false });
      state.categories.clear();
      state.sizes.clear();
      state.colors.clear();
      syncControls();
      renderGrid();
      return;
    }
    const chip = e.target.closest('[data-remove-type]');
    if (chip) {
      const { removeType: type, removeValue: value } = chip.dataset;
      if (state[type] instanceof Set) state[type].delete(value);
      else if (type === 'price') Object.assign(state, { min: 0, max: PRICE_CEIL });
      else if (type === 'q') state.q = '';
      else state[type] = false;
      syncControls();
      renderGrid();
      (els.active.querySelector('button') || els.search).focus();
      return;
    }
    if (e.target.closest('[data-filters-open]')) openFilters();
    if (e.target.closest('[data-filters-close], [data-filters-overlay]')) closeFilters();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeFilters();
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => e.matches && closeFilters());

  // Wishlist view stays live when hearts are toggled.
  on('wishlist:change', () => state.wishlistOnly && renderGrid());
}
