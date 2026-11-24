/**
 * DRIFTLINE — Home page
 * preloader · hero (split title, mouse parallax + tilt) · category counts ·
 * pinned horizontal featured scroll · scroll word-fill statement · stats
 * count-up · flip countdown · draggable testimonial carousel · newsletter
 */
import { CONFIG } from './config.js';
import { getFeaturedProducts, getProductsByCategory } from './products.js';
import { productCardHTML, attachValidation, toast } from './ui.js';
import { syncWishButtons } from './cart.js';
import { splitText, countUp } from './animations.js';
import {
  $, $$, clamp, lerp, onScroll, onResize, mq, wait,
  prefersReducedMotion, isTouchDevice, lockScroll, unlockScroll, formatPrice,
} from './utils.js';
import { ICONS } from './icons.js';

export async function init() {
  initCategoryCounts();
  initFeatured();
  initStatement();
  initStats();
  initCountdown();
  initCarousel();
  initNewsletter();
  initHero();

  await runPreloader();
  document.documentElement.classList.add('is-ready');
}

/* ==========================================================================
   1. Preloader — letters clip in, counter climbs, curtain lifts
   ========================================================================== */
function runPreloader() {
  const pre = $('[data-preloader]');
  const root = document.documentElement;
  if (!pre) return Promise.resolve();
  if (root.classList.contains('skip-preloader')) {
    pre.remove();
    return Promise.resolve();
  }

  lockScroll();
  const countEl = $('[data-preloader-count]', pre);
  const bar = $('[data-preloader-bar]', pre);
  const minDuration = prefersReducedMotion() ? 200 : 2000;
  const started = performance.now();

  // Wait for the page (fonts, hero image) but never longer than 4s.
  let pageReady = false;
  const loaded = new Promise((r) =>
    document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true })
  );
  Promise.race([loaded, wait(4000)]).then(() => (pageReady = true));

  return new Promise((resolve) => {
    const tick = (now) => {
      const t = clamp((now - started) / minDuration);
      const progress = pageReady ? t : Math.min(t, 0.9); // hold at 90% until loaded
      countEl.textContent = String(Math.round(progress * 100)).padStart(3, '0');
      bar.style.transform = `scaleX(${progress})`;

      if (progress < 1) {
        requestAnimationFrame(tick);
        return;
      }
      pre.classList.add('is-done');
      try {
        sessionStorage.setItem(CONFIG.storageKeys.preloaded, '1');
      } catch { /* ignore */ }
      setTimeout(resolve, prefersReducedMotion() ? 0 : 350); // hero starts as the curtain lifts
      setTimeout(() => {
        pre.remove();
        unlockScroll();
      }, prefersReducedMotion() ? 50 : 1100);
    };
    requestAnimationFrame(tick);
  });
}

/* ==========================================================================
   2. Hero — per-letter title, floating product with mouse parallax + tilt
   ========================================================================== */
function initHero() {
  const title = $('[data-hero-title]');
  if (title) splitText(title, 'chars');

  const price = $('[data-hero-price]');
  if (price) price.textContent = formatPrice(145000);

  const hero = $('.hero');
  const tilt = $('[data-hero-tilt]');
  if (!hero || !tilt || prefersReducedMotion() || isTouchDevice()) return;

  const target = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };
  let raf = null;

  const render = () => {
    current.x = lerp(current.x, target.x, 0.08);
    current.y = lerp(current.y, target.y, 0.08);
    tilt.style.transform =
      `perspective(1100px) rotateY(${(current.x * 12).toFixed(2)}deg) rotateX(${(-current.y * 10).toFixed(2)}deg) ` +
      `translate3d(${(current.x * 24).toFixed(1)}px, ${(current.y * 18).toFixed(1)}px, 0)`;
    tilt.style.setProperty('--mx', current.x.toFixed(3));
    tilt.style.setProperty('--my', current.y.toFixed(3));
    if (Math.abs(current.x - target.x) > 0.001 || Math.abs(current.y - target.y) > 0.001) {
      raf = requestAnimationFrame(render);
    } else raf = null;
  };
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(render);
  };

  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    target.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
    target.y = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
    kick();
  });
  hero.addEventListener('pointerleave', () => {
    target.x = 0;
    target.y = 0;
    kick();
  });
}

/* ==========================================================================
   3. Category counts from the catalogue
   ========================================================================== */
function initCategoryCounts() {
  $$('[data-cat-count]').forEach((el) => {
    el.textContent = getProductsByCategory(el.dataset.catCount).length;
  });
}

/* ==========================================================================
   4. Featured — sticky pin, cards slide sideways while scrolling down
   Falls back to native horizontal swipe on small screens / reduced motion.
   ========================================================================== */
function initFeatured() {
  const section = $('[data-featured]');
  const track = $('[data-featured-track]');
  if (!section || !track) return;

  const products = getFeaturedProducts().slice(0, 8);
  track.innerHTML =
    products.map((p, i) => `<li class="featured__item">${productCardHTML(p, { index: i })}</li>`).join('') +
    `<li class="featured__item featured__item--cta">
       <a class="featured__all" href="shop.html" data-cursor="view" data-cursor-label="Shop">
         <span class="featured__all-count">${products.length}+</span>
         <span class="featured__all-text">See the full collection</span>
         <span class="featured__all-icon">${ICONS.arrowRight}</span>
       </a>
     </li>`;
  syncWishButtons(track);

  const viewport = $('[data-featured-viewport]');
  const bar = $('[data-featured-bar]');
  const currentEl = $('[data-featured-current]');
  const total = products.length;
  $('[data-featured-total]').textContent = String(total).padStart(2, '0');

  let pinned = false;
  let start = 0;
  let distance = 0;

  const updateUI = (p) => {
    bar.style.transform = `scaleX(${Math.max(0.02, p)})`;
    currentEl.textContent = String(Math.min(total, Math.floor(p * (total - 1) + 1))).padStart(2, '0');
  };

  const measure = () => {
    pinned = mq('(min-width: 768px)') && !prefersReducedMotion();
    section.classList.toggle('is-pinned', pinned);
    if (!pinned) {
      section.style.height = '';
      track.style.transform = '';
      return;
    }
    distance = Math.max(0, track.scrollWidth - viewport.clientWidth);
    section.style.height = `${window.innerHeight + distance}px`;
    start = section.getBoundingClientRect().top + window.scrollY;
  };

  measure();
  onResize(measure);
  // Re-measure after images/fonts settle widths.
  window.addEventListener('load', measure, { once: true });

  onScroll((y) => {
    if (!pinned) return;
    const p = distance ? clamp((y - start) / distance) : 0;
    track.style.transform = `translate3d(${(-p * distance).toFixed(1)}px, 0, 0)`;
    updateUI(p);
  });

  // Keyboard users: tabbing to an off-screen card scrolls the page so it slides into view.
  track.addEventListener('focusin', (e) => {
    if (!pinned) return;
    const item = e.target.closest('.featured__item');
    if (!item) return;
    viewport.scrollLeft = 0; // browsers may try to scroll the clipped viewport itself
    const p = clamp((item.offsetLeft - viewport.clientWidth * 0.2) / distance);
    window.scrollTo({ top: start + p * distance, behavior: 'auto' });
  });

  // Native mode: progress follows the horizontal scroll position.
  viewport.addEventListener('scroll', () => {
    if (pinned) return;
    const max = viewport.scrollWidth - viewport.clientWidth;
    updateUI(max ? viewport.scrollLeft / max : 0);
  }, { passive: true });
}

/* ==========================================================================
   5. Statement — words light up progressively with scroll position
   ========================================================================== */
function initStatement() {
  const el = $('[data-word-fill]');
  if (!el) return;
  splitText(el, 'words');
  const words = $$('.split-word__inner', el);
  let lit = -1;

  onScroll(() => {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    // 0 when the paragraph top hits 85% of the viewport, 1 when its bottom reaches 45%.
    const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.4));
    const next = Math.round(p * words.length);
    if (next === lit) return;
    words.forEach((w, i) => w.classList.toggle('is-lit', i < next));
    lit = next;
  });
}

/* ==========================================================================
   6. Stats — count up the first time they enter the viewport
   ========================================================================== */
function initStats() {
  const els = $$('[data-count]');
  if (!els.length) return;
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const decimals = Number(el.dataset.decimals || 0);
        const suffix = el.dataset.suffix || '';
        countUp(el, parseFloat(el.dataset.count), {
          duration: 2200,
          decimals,
          format: (v) => `${v.toFixed(decimals)}${suffix}`,
        });
        io.unobserve(el);
      }),
    { threshold: 0.6 }
  );
  els.forEach((el) => io.observe(el));
}

/* ==========================================================================
   7. Countdown — flip-clock digits (3D leaf rotates on change)
   ========================================================================== */
function flipTemplate(v) {
  return `
    <span class="flip" data-value="${v}">
      <span class="flip__half flip__top"><span>${v}</span></span>
      <span class="flip__half flip__bottom"><span>${v}</span></span>
      <span class="flip__leaf">
        <span class="flip__half flip__leaf-front"><span>${v}</span></span>
        <span class="flip__half flip__leaf-back"><span>${v}</span></span>
      </span>
    </span>`;
}

function setFlip(flip, value) {
  const old = flip.dataset.value;
  if (old === value) return;
  flip.dataset.value = value;
  const [top, bottom, front, back] = ['.flip__top', '.flip__bottom', '.flip__leaf-front', '.flip__leaf-back'].map(
    (s) => flip.querySelector(`${s} > span`)
  );

  if (prefersReducedMotion()) {
    [top, bottom, front, back].forEach((s) => (s.textContent = value));
    return;
  }
  // Static halves: new top, old bottom. Leaf: old on front, new on back.
  top.textContent = value;
  bottom.textContent = old;
  front.textContent = old;
  back.textContent = value;
  flip.classList.remove('is-flipping');
  void flip.offsetWidth;
  flip.classList.add('is-flipping');

  clearTimeout(flip._t);
  flip._t = setTimeout(() => {
    bottom.textContent = value;
    front.textContent = value;
    flip.classList.remove('is-flipping');
  }, 620);
}

function initCountdown() {
  const root = $('[data-countdown]');
  if (!root) return;
  const nameEl = $('[data-drop-name]');
  if (nameEl) nameEl.textContent = CONFIG.newDrop.name;

  // Roll the date forward so the timer never sits at zero.
  let target = new Date(CONFIG.newDrop.date).getTime();
  const step = CONFIG.newDrop.rollEveryDays * 864e5;
  while (target <= Date.now()) target += step;

  const units = {};
  $$('[data-unit]', root).forEach((u) => {
    u.innerHTML = flipTemplate('0') + flipTemplate('0');
    units[u.dataset.unit] = $$('.flip', u);
  });
  const sr = $('[data-countdown-sr]');

  const update = () => {
    const diff = Math.max(0, target - Date.now());
    const values = {
      days: Math.min(99, Math.floor(diff / 864e5)),
      hours: Math.floor((diff / 36e5) % 24),
      minutes: Math.floor((diff / 6e4) % 60),
      seconds: Math.floor((diff / 1e3) % 60),
    };
    Object.entries(values).forEach(([unit, v]) => {
      const [a, b] = String(v).padStart(2, '0');
      setFlip(units[unit][0], a);
      setFlip(units[unit][1], b);
    });
    const label = `${values.days} days, ${values.hours} hours and ${values.minutes} minutes until ${CONFIG.newDrop.name}`;
    root.setAttribute('aria-label', label);
    // Screen-reader text only changes once a minute to avoid chatter.
    if (sr && sr.dataset.minute !== String(values.minutes)) {
      sr.dataset.minute = String(values.minutes);
      sr.textContent = label;
    }
  };

  update();
  // Align ticks to the start of each second.
  setTimeout(() => {
    update();
    setInterval(update, 1000);
  }, 1000 - (Date.now() % 1000));
}

/* ==========================================================================
   8. Testimonials carousel — autoplay, buttons, dots, keyboard, drag/swipe
   ========================================================================== */
function initCarousel() {
  const root = $('[data-carousel]');
  const track = $('[data-carousel-track]');
  if (!root || !track) return;
  const slides = [...track.children];
  const dotsWrap = $('[data-carousel-dots]');
  const AUTOPLAY_MS = 5000;

  let index = 0;
  let perView = 1;
  let step = 0;
  let maxIndex = 0;
  let timer = null;
  let paused = false;

  root.tabIndex = 0;
  slides.forEach((s, i) => s.setAttribute('aria-label', `${i + 1} of ${slides.length}`));

  const measure = () => {
    perView = mq('(min-width: 1024px)') ? 3 : mq('(min-width: 640px)') ? 2 : 1;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    step = slides[0].getBoundingClientRect().width + gap;
    maxIndex = Math.max(0, slides.length - perView);
    dotsWrap.innerHTML = Array.from(
      { length: maxIndex + 1 },
      (_, i) => `<button class="carousel__dot" type="button" data-dot="${i}" aria-label="Show reviews from ${i + 1}"></button>`
    ).join('');
    go(Math.min(index, maxIndex), false);
  };

  function go(i, animate = true) {
    index = i > maxIndex ? 0 : i < 0 ? maxIndex : i;
    track.classList.toggle('no-transition', !animate);
    track.style.transform = `translate3d(${-index * step}px, 0, 0)`;
    slides.forEach((s, n) => s.setAttribute('aria-hidden', String(n < index || n >= index + perView)));
    $$('.carousel__dot', dotsWrap).forEach((d, n) => d.setAttribute('aria-current', String(n === index)));
  }

  const startAuto = () => {
    stopAuto();
    if (prefersReducedMotion() || paused) return;
    timer = setInterval(() => go(index + 1), AUTOPLAY_MS);
  };
  const stopAuto = () => clearInterval(timer);

  $('[data-carousel-prev]')?.addEventListener('click', () => { go(index - 1); startAuto(); });
  $('[data-carousel-next]')?.addEventListener('click', () => { go(index + 1); startAuto(); });
  dotsWrap.addEventListener('click', (e) => {
    const dot = e.target.closest('[data-dot]');
    if (dot) { go(Number(dot.dataset.dot)); startAuto(); }
  });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { go(index + 1); startAuto(); }
    if (e.key === 'ArrowLeft') { go(index - 1); startAuto(); }
  });

  // Pause on hover / keyboard focus / hidden tab.
  root.addEventListener('pointerenter', () => { paused = true; stopAuto(); });
  root.addEventListener('pointerleave', () => { paused = false; startAuto(); });
  root.addEventListener('focusin', () => { paused = true; stopAuto(); });
  root.addEventListener('focusout', () => { paused = false; startAuto(); });
  document.addEventListener('visibilitychange', () => (document.hidden ? stopAuto() : startAuto()));

  // Drag / swipe
  let startX = 0;
  let dx = 0;
  let dragging = false;
  track.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    startX = e.clientX;
    dx = 0;
    track.setPointerCapture(e.pointerId);
    track.classList.add('is-dragging', 'no-transition');
    stopAuto();
  });
  track.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dx = e.clientX - startX;
    // Rubber-band at the edges.
    const atEdge = (index === 0 && dx > 0) || (index === maxIndex && dx < 0);
    const offset = atEdge ? dx * 0.35 : dx;
    track.style.transform = `translate3d(${-index * step + offset}px, 0, 0)`;
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('is-dragging');
    const threshold = Math.min(80, step * 0.2);
    if (dx < -threshold && index < maxIndex) go(index + 1);
    else if (dx > threshold && index > 0) go(index - 1);
    else go(index);
    if (!paused) startAuto();
  };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

  measure();
  onResize(measure);
  startAuto();
}

/* ==========================================================================
   9. Newsletter — inline validation, animated button, success state
   ========================================================================== */
function initNewsletter() {
  const form = $('[data-newsletter]');
  if (!form) return;
  const validate = attachValidation(form);
  const success = $('[data-newsletter-success]', form);
  const input = $('input', form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.classList.contains('is-loading') || form.classList.contains('is-success')) return;
    if (!validate()) return;

    form.classList.add('is-loading');
    form.querySelector('button').disabled = true;
    await wait(1300); // simulated request
    form.classList.remove('is-loading');
    form.classList.add('is-success');
    input.readOnly = true;
    success.textContent = `You're on the list! A welcome code is heading to ${input.value.trim()}. (Psst — try DRIFT10 at checkout.)`;
    toast('Subscribed to The Drift List.', { type: 'success' });
  });
}
