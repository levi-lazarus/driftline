/**
 * DRIFTLINE — Cart page & checkout
 * Full cart table, order summary with promo codes and shipping meter,
 * validated checkout form (inline errors) and a success modal with confetti.
 */
import { CONFIG } from './config.js';
import { imageUrl } from './products.js';
import { cart, handleCartControls, stepperHTML } from './cart.js';
import { attachValidation, setFieldError, toast } from './ui.js';
import { confetti } from './animations.js';
import { ICONS } from './icons.js';
import {
  $, $$, escapeHtml, formatPrice, on, storage, wait, trapFocus, lockScroll, unlockScroll, prefersReducedMotion,
} from './utils.js';

const els = {};

export function init() {
  Object.assign(els, {
    list: $('[data-cart-list]'),
    empty: $('[data-cart-page-empty]'),
    filled: $('[data-cart-filled]'),
    lead: $('[data-cart-lead]'),
    count: $('[data-summary-count]'),
    subtotal: $('[data-summary-subtotal]'),
    discountRow: $('[data-summary-discount-row]'),
    discount: $('[data-summary-discount]'),
    code: $('[data-summary-code]'),
    shipping: $('[data-summary-shipping]'),
    total: $('[data-summary-total]'),
    orderTotal: $('[data-order-total]'),
    shipText: $('[data-page-ship-text]'),
    shipBar: $('[data-page-ship-bar]'),
    ship: $('[data-page-ship]'),
    promoForm: $('[data-promo-form]'),
    promoSuccess: $('[data-promo-success]'),
    form: $('[data-checkout-form]'),
    modal: $('[data-success-modal]'),
  });

  render();
  on('cart:change', render);

  els.list.addEventListener('click', handleCartControls);
  initPromo();
  initCheckout();
  initModal();

  if (window.location.hash === '#checkout' && cart.items.length) {
    requestAnimationFrame(() => $('#checkout').scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' }));
  }
}

/* ==========================================================================
   Rendering
   ========================================================================== */
function lineTemplate(l) {
  const p = l.product;
  return `
  <li class="cart-row" data-line="${escapeHtml(l.key)}">
    <div class="cart-row__product">
      <a class="cart-row__media media" href="product.html?id=${p.id}" tabindex="-1" aria-hidden="true">
        <img src="${imageUrl(p.images[0], 240, 300)}" alt="" width="120" height="150" loading="lazy" decoding="async">
      </a>
      <div class="cart-row__info">
        <a class="cart-row__name" href="product.html?id=${p.id}">${escapeHtml(p.name)}</a>
        <p class="cart-row__variant">${escapeHtml(l.color)} · Size ${escapeHtml(l.size)}</p>
        <p class="cart-row__unit">${formatPrice(p.price)} each</p>
        <button class="cart-row__remove" type="button" data-remove="${escapeHtml(l.key)}">${ICONS.trash}<span>Remove</span></button>
      </div>
    </div>
    <div class="cart-row__qty">${stepperHTML(l)}</div>
    <p class="cart-row__total">${formatPrice(l.lineTotal)}</p>
  </li>`;
}

function render() {
  const lines = cart.detailed();
  const empty = lines.length === 0;
  const modalOpen = els.modal.classList.contains('is-open');

  els.empty.hidden = !empty;
  els.filled.hidden = empty;
  if (!modalOpen) {
    els.lead.textContent = empty
      ? 'Nothing here yet — let’s fix that.'
      : `${cart.count()} item${cart.count() === 1 ? '' : 's'} ready to drift your way.`;
  }
  if (empty) return;

  els.list.innerHTML = lines.map(lineTemplate).join('');

  const t = cart.totals();
  els.count.textContent = `(${cart.count()} item${cart.count() === 1 ? '' : 's'})`;
  els.subtotal.textContent = formatPrice(t.subtotal);
  els.discountRow.hidden = !t.discount;
  els.discount.textContent = `−${formatPrice(t.discount)}`;
  els.code.textContent = t.promoCode ? `(${t.promoCode})` : '';
  els.shipping.textContent = t.shipping ? formatPrice(t.shipping) : 'Free';
  els.total.textContent = formatPrice(t.total);
  els.orderTotal.textContent = formatPrice(t.total);

  const remaining = Math.max(0, CONFIG.shipping.freeThreshold - (t.subtotal - t.discount));
  els.shipText.innerHTML = remaining
    ? `Add <strong>${formatPrice(remaining)}</strong> more for free shipping.`
    : '<strong>Free shipping unlocked.</strong>';
  els.shipBar.style.transform = `scaleX(${Math.min(1, (t.subtotal - t.discount) / CONFIG.shipping.freeThreshold)})`;
  els.ship.classList.toggle('is-complete', !remaining);

  if (t.promoCode && !els.promoSuccess.textContent) showPromoApplied(t.promoCode);
}

/* ==========================================================================
   Promo codes
   ========================================================================== */
function showPromoApplied(code) {
  const pct = Math.round(CONFIG.promoCodes[code] * 100);
  els.promoSuccess.innerHTML = `${ICONS.check} <span><strong>${code}</strong> applied — ${pct}% off.</span> <button type="button" class="promo__remove" data-promo-remove>Remove</button>`;
}

function initPromo() {
  const input = $('#promo-code', els.promoForm);
  els.promoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = input.value.trim().toUpperCase();
    if (!code) {
      setFieldError(input, 'Enter a promo code.');
      return;
    }
    if (!CONFIG.promoCodes[code]) {
      setFieldError(input, `“${code}” isn’t a valid code.`);
      input.closest('.field').classList.add('shake');
      setTimeout(() => input.closest('.field').classList.remove('shake'), 500);
      return;
    }
    setFieldError(input, '');
    storage.set(CONFIG.storageKeys.promo, code);
    input.value = '';
    showPromoApplied(code);
    render();
    toast(`Promo ${code} applied.`);
  });
  input.addEventListener('input', () => setFieldError(input, ''));

  els.promoSuccess.addEventListener('click', (e) => {
    if (!e.target.closest('[data-promo-remove]')) return;
    storage.remove(CONFIG.storageKeys.promo);
    els.promoSuccess.innerHTML = '';
    render();
    input.focus();
  });
}

/* ==========================================================================
   Checkout
   ========================================================================== */
function initCheckout() {
  const form = els.form;
  const validateAll = attachValidation(form);
  const card = $('#co-card', form);
  const exp = $('#co-exp', form);
  const cvc = $('#co-cvc', form);

  // Input masks: "4242 4242 4242 4242", "MM/YY", digits-only CVC.
  card.addEventListener('input', () => {
    const digits = card.value.replace(/\D/g, '').slice(0, 19);
    card.value = digits.replace(/(.{4})/g, '$1 ').trim();
  });
  exp.addEventListener('input', (e) => {
    let digits = exp.value.replace(/\D/g, '').slice(0, 4);
    if (digits.length === 1 && Number(digits) > 1) digits = `0${digits}`;
    exp.value = digits.length > 2 || (digits.length === 2 && e.inputType !== 'deleteContentBackward')
      ? `${digits.slice(0, 2)}/${digits.slice(2)}`
      : digits;
  });
  cvc.addEventListener('input', () => (cvc.value = cvc.value.replace(/\D/g, '').slice(0, 4)));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!cart.items.length) return;
    if (!validateAll()) {
      toast('Please fix the highlighted fields.', { type: 'error' });
      return;
    }

    const btn = $('[data-place-order]', form);
    const label = btn.innerHTML;
    btn.classList.add('is-loading');
    btn.innerHTML = '<span class="btn__spinner" aria-hidden="true"></span> Processing payment…';
    await wait(1600); // simulated payment

    const totals = cart.totals();
    const data = new FormData(form);
    openSuccess({
      name: String(data.get('name')).trim().split(/\s+/)[0],
      email: String(data.get('email')).trim(),
      items: cart.count(),
      total: totals.total,
      lagos: data.get('state') === 'Lagos',
    });

    cart.clear();
    storage.remove(CONFIG.storageKeys.promo);
    els.promoSuccess.innerHTML = '';
    form.reset();
    $$('.field', form).forEach((f) => f.classList.remove('is-valid', 'has-error'));
    $$('[data-touched]', form).forEach((el) => delete el.dataset.touched);
    btn.classList.remove('is-loading');
    btn.innerHTML = label;
  });
}

/* ==========================================================================
   Success modal
   ========================================================================== */
let releaseModal = null;

function openSuccess({ name, email, items, total, lagos }) {
  const m = els.modal;
  $('[data-success-name]', m).textContent = name || 'friend';
  $('[data-success-email]', m).textContent = email;
  $('[data-order-id]', m).textContent = `#DL-${Date.now().toString(36).slice(-6).toUpperCase()}`;
  $('[data-success-items]', m).textContent = String(items);
  $('[data-success-total]', m).textContent = formatPrice(total);
  $('[data-success-eta]', m).textContent = lagos ? '1–2 days' : '2–5 days';

  m.classList.add('is-open');
  m.setAttribute('aria-hidden', 'false');
  lockScroll();
  releaseModal = trapFocus(m, { initialFocus: $('.success__ctas a', m) });
  setTimeout(() => confetti(), 250);
  els.lead.textContent = 'Order placed. Thank you for moving different.';
}

function closeSuccess() {
  const m = els.modal;
  if (!m.classList.contains('is-open')) return;
  m.classList.remove('is-open');
  m.setAttribute('aria-hidden', 'true');
  unlockScroll();
  releaseModal?.();
  render();
}

function initModal() {
  els.modal.addEventListener('click', (e) => {
    if (e.target.closest('[data-modal-close]')) closeSuccess();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSuccess();
  });
}
