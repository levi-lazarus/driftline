/**
 * DRIFTLINE — Product detail page
 * Loads a product by ?id=, renders the gallery (thumbnails + hover zoom),
 * colour/size selectors, quantity stepper, add-to-cart with fly-to-cart,
 * wishlist toggle, details accordion and related products.
 */
import {
  getProductById, getRelatedProducts, imageUrl, imageSrcset, imageLqip, categoryLabel, COLORS,
} from './products.js';
import { productCardHTML, starsHTML, toast } from './ui.js';
import { cart, flyToCart, openDrawer, syncWishButtons } from './cart.js';
import { ICONS } from './icons.js';
import { CONFIG } from './config.js';
import { $, $$, escapeHtml, formatPrice, getParam, prefersReducedMotion, isTouchDevice, wait } from './utils.js';

const MAX_QTY = 10;

export async function init() {
  const root = $('[data-product-root]');
  const product = getProductById(getParam('id'));

  await wait(prefersReducedMotion() ? 0 : 350); // let the skeleton breathe for a beat
  root.removeAttribute('aria-busy');

  if (!product) {
    renderNotFound(root);
    return;
  }

  document.title = `${product.name} — DRIFTLINE`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', product.description);
  root.innerHTML = template(product);
  syncWishButtons(root);

  initGallery(root, product);
  initOptions(root, product);
  renderRelated(product);
}

/* ==========================================================================
   Templates
   ========================================================================== */
function template(p) {
  const name = escapeHtml(p.name);
  const singleSize = p.sizes.length === 1;
  const freeShip = p.price >= CONFIG.shipping.freeThreshold;

  const slides = p.images
    .map(
      (img, i) => `
      <img class="gallery__img${i === 0 ? ' is-active' : ''}" data-index="${i}"
           src="${imageUrl(img, 900, 1125)}" srcset="${imageSrcset(img, 1.25, [500, 900, 1300])}"
           sizes="(min-width: 1024px) 50vw, 100vw"
           alt="${i === 0 ? name : `${name} — view ${i + 1}`}" width="900" height="1125"
           ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"${i === 0 ? '' : ' aria-hidden="true"'}>`
    )
    .join('');

  const thumbs = p.images
    .map(
      (img, i) => `
      <li>
        <button class="gallery__thumb media" type="button" data-thumb="${i}" aria-label="Show image ${i + 1} of ${p.images.length}" aria-pressed="${i === 0}" style="--lqip:url('${imageLqip(img)}')">
          <img src="${imageUrl(img, 200, 250)}" alt="" width="100" height="125" loading="lazy" decoding="async">
        </button>
      </li>`
    )
    .join('');

  const colors = p.colors
    .map(
      (c, i) => `
      <label class="color-option" title="${c}">
        <input type="radio" name="color" value="${c}" ${i === 0 ? 'checked' : ''}>
        <span class="color-option__dot" style="--swatch:${COLORS[c] || '#888'}"></span>
        <span class="visually-hidden">${c}</span>
      </label>`
    )
    .join('');

  const sizes = p.sizes
    .map(
      (s) => `
      <label class="chip chip--size size-option">
        <input type="radio" name="size" value="${s}" ${singleSize ? 'checked' : ''}>
        <span class="chip__face">${s}</span>
      </label>`
    )
    .join('');

  return `
  <nav class="breadcrumbs pdp__crumbs" aria-label="Breadcrumb">
    <ol role="list">
      <li><a href="index.html">Home</a></li>
      <li><a href="shop.html">Shop</a></li>
      <li><a href="shop.html?category=${p.category}">${categoryLabel(p.category)}</a></li>
      <li><span aria-current="page">${name}</span></li>
    </ol>
  </nav>

  <div class="pdp__grid">
    <section class="pdp__gallery gallery" aria-label="${name} images">
      <div class="gallery__main media" data-zoom data-cursor="view" data-cursor-label="Zoom" style="--lqip:url('${imageLqip(p.images[0])}')">
        ${slides}
        ${p.isNew ? '<span class="tag tag--new">New drop</span>' : ''}
        <span class="gallery__hint" aria-hidden="true">${isTouchDevice() ? 'Tap thumbnails to browse' : 'Hover to zoom'}</span>
      </div>
      ${p.images.length > 1 ? `<ul class="gallery__thumbs" role="list">${thumbs}</ul>` : ''}
    </section>

    <section class="pdp__info" aria-labelledby="pdp-title">
      <p class="eyebrow">${categoryLabel(p.category)} · ${escapeHtml(p.type)}</p>
      <h1 class="pdp__title" id="pdp-title">${name}</h1>
      <div class="pdp__meta">
        ${starsHTML(p.rating)}
        <span class="pdp__reviews">${p.reviews} reviews</span>
      </div>
      <p class="pdp__price">${formatPrice(p.price)}</p>
      <p class="pdp__desc">${escapeHtml(p.description)}</p>

      <form class="pdp__form" data-pdp-form novalidate>
        <fieldset class="option-group">
          <legend class="option-group__title">Colour: <strong data-color-label>${p.colors[0]}</strong></legend>
          <div class="color-options">${colors}</div>
        </fieldset>

        <fieldset class="option-group" aria-describedby="size-error">
          <legend class="option-group__title">Size${singleSize ? '' : ' <span class="option-group__hint">(EU sizing)</span>'}</legend>
          <div class="chip-group size-options" data-size-group>${sizes}</div>
          <p class="field__error" id="size-error" data-size-error role="alert"></p>
        </fieldset>

        <div class="pdp__buy">
          <div class="stepper" role="group" aria-label="Quantity">
            <button class="stepper__btn" type="button" data-step="-1" aria-label="Decrease quantity">${ICONS.minus}</button>
            <label class="visually-hidden" for="pdp-qty">Quantity</label>
            <input class="stepper__input" id="pdp-qty" type="number" inputmode="numeric" min="1" max="${MAX_QTY}" value="1" data-qty-input>
            <button class="stepper__btn" type="button" data-step="1" aria-label="Increase quantity">${ICONS.plus}</button>
          </div>
          <button class="btn btn--accent btn--lg pdp__add" type="submit" data-add-btn>
            <span class="pdp__add-label">Add to bag — <span data-add-total>${formatPrice(p.price)}</span></span>
          </button>
          <button class="wish-btn wish-btn--lg" type="button" data-wishlist-toggle="${p.id}" aria-pressed="false" aria-label="Add ${name} to wishlist">${ICONS.heart}</button>
        </div>
      </form>

      <ul class="perks" role="list">
        <li>${ICONS.truck}<span>${freeShip ? 'Ships free' : `Free shipping over ${formatPrice(CONFIG.shipping.freeThreshold)}`}, 2–4 day delivery in Lagos</span></li>
        <li>${ICONS.refresh}<span>30-day free returns &amp; size swaps</span></li>
        <li>${ICONS.shield}<span>Secure checkout, authentic guaranteed</span></li>
      </ul>

      <div class="accordion">
        <details class="accordion__item" open>
          <summary class="accordion__summary">Details<span class="accordion__icon">${ICONS.plus}</span></summary>
          <div class="accordion__content">
            <p>${escapeHtml(p.description)}</p>
            <ul class="pdp__tags" role="list">${p.tags.map((t) => `<li>#${escapeHtml(t)}</li>`).join('')}</ul>
          </div>
        </details>
        <details class="accordion__item">
          <summary class="accordion__summary">Shipping &amp; returns<span class="accordion__icon">${ICONS.plus}</span></summary>
          <div class="accordion__content">
            <p>Lagos 1–2 days, rest of Nigeria 2–5 days, international 5–10 days. Orders over ${formatPrice(CONFIG.shipping.freeThreshold)} ship free. Not feeling it? Return within 30 days for a full refund.</p>
          </div>
        </details>
        <details class="accordion__item">
          <summary class="accordion__summary">Care<span class="accordion__icon">${ICONS.plus}</span></summary>
          <div class="accordion__content">
            <p>Spot clean or cold wash inside-out. Air dry away from direct sun. Store in the DRIFTLINE dust bag to keep it fresh.</p>
          </div>
        </details>
      </div>
    </section>
  </div>`;
}

function renderNotFound(root) {
  document.title = 'Product not found — DRIFTLINE';
  root.innerHTML = `
    <div class="not-found">
      <p class="not-found__code" aria-hidden="true">404</p>
      <h1 class="not-found__title">This one drifted away.</h1>
      <p class="not-found__text">We couldn't find that product. It may have sold out or the link is broken.</p>
      <a class="btn btn--accent" href="shop.html">Back to the shop</a>
    </div>`;
}

/* ==========================================================================
   Gallery — thumbnails, keyboard nav, hover zoom
   ========================================================================== */
function initGallery(root, product) {
  const main = $('[data-zoom]', root);
  const imgs = $$('.gallery__img', root);
  const thumbs = $$('[data-thumb]', root);
  let active = 0;

  const show = (i) => {
    active = (i + imgs.length) % imgs.length;
    imgs.forEach((img, n) => {
      img.classList.toggle('is-active', n === active);
      img.setAttribute('aria-hidden', String(n !== active));
    });
    thumbs.forEach((t, n) => t.setAttribute('aria-pressed', String(n === active)));
    main.style.setProperty('--lqip', `url('${imageLqip(product.images[active])}')`);
  };

  thumbs.forEach((t) => t.addEventListener('click', () => show(Number(t.dataset.thumb))));
  root.querySelector('.gallery__thumbs')?.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    show(active + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1));
    thumbs[active].focus();
  });

  // Zoom: scale the active image and move its transform-origin with the pointer.
  if (isTouchDevice() || prefersReducedMotion()) return;
  main.addEventListener('pointerenter', () => main.classList.add('is-zooming'));
  main.addEventListener('pointerleave', () => {
    main.classList.remove('is-zooming');
    imgs[active].style.transformOrigin = '';
  });
  main.addEventListener('pointermove', (e) => {
    const r = main.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    imgs[active].style.transformOrigin = `${x}% ${y}%`;
  });
}

/* ==========================================================================
   Options, quantity, add to cart
   ========================================================================== */
function initOptions(root, product) {
  const form = $('[data-pdp-form]', root);
  const qtyInput = $('[data-qty-input]', form);
  const addBtn = $('[data-add-btn]', form);
  const totalEl = $('[data-add-total]', form);
  const sizeError = $('[data-size-error]', form);
  const sizeGroup = $('[data-size-group]', form);

  const clampQty = (v) => Math.min(MAX_QTY, Math.max(1, Number.parseInt(v, 10) || 1));
  const updateTotal = () => (totalEl.textContent = formatPrice(product.price * clampQty(qtyInput.value)));

  form.addEventListener('change', (e) => {
    if (e.target.name === 'color') $('[data-color-label]', form).textContent = e.target.value;
    if (e.target.name === 'size') {
      sizeError.textContent = '';
      sizeGroup.classList.remove('has-error');
    }
  });

  $$('[data-step]', form).forEach((btn) =>
    btn.addEventListener('click', () => {
      qtyInput.value = clampQty(Number(qtyInput.value) + Number(btn.dataset.step));
      updateTotal();
    })
  );
  qtyInput.addEventListener('input', updateTotal);
  qtyInput.addEventListener('blur', () => {
    qtyInput.value = clampQty(qtyInput.value);
    updateTotal();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (addBtn.classList.contains('is-loading')) return;
    const size = form.querySelector('input[name="size"]:checked')?.value ?? '';
    const color = form.querySelector('input[name="color"]:checked')?.value;

    if (!size) {
      sizeError.textContent = 'Please choose a size first.';
      sizeGroup.classList.add('has-error');
      sizeGroup.classList.remove('shake');
      void sizeGroup.offsetWidth;
      sizeGroup.classList.add('shake');
      sizeGroup.querySelector('input')?.focus();
      return;
    }

    const qty = clampQty(qtyInput.value);
    addBtn.classList.add('is-loading');
    const label = addBtn.innerHTML;
    addBtn.innerHTML = '<span class="btn__spinner" aria-hidden="true"></span><span>Adding…</span>';

    const flight = flyToCart($('.gallery__img.is-active', root));
    cart.add(product.id, { color, size, qty });
    await flight;

    addBtn.classList.remove('is-loading');
    addBtn.classList.add('is-added');
    addBtn.innerHTML = `${ICONS.check}<span>Added to bag</span>`;
    toast(`${qty} × ${product.name} (${color}, ${size}) added to your bag.`, {
      action: { label: 'View bag', href: 'cart.html', onClick: openDrawer },
    });
    setTimeout(() => {
      addBtn.classList.remove('is-added');
      addBtn.innerHTML = label;
      updateTotal();
    }, 1800);
  });
}

/* ==========================================================================
   Related products
   ========================================================================== */
function renderRelated(product) {
  const section = $('[data-related]');
  const grid = $('[data-related-grid]');
  if (!section || !grid) return;
  grid.innerHTML = getRelatedProducts(product, 4)
    .map((p, i) => productCardHTML(p, { index: i }))
    .join('');
  section.hidden = false;
  syncWishButtons(grid);
}
