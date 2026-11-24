/**
 * DRIFTLINE — Reusable animation toolkit
 *  - scroll reveal (IntersectionObserver) with utility attributes
 *  - text splitting (chars / words) that stays screen-reader friendly
 *  - multi-speed parallax
 *  - magnetic buttons
 *  - number count-up
 *  - confetti burst (canvas)
 *
 * Usage in HTML:
 *   data-reveal="fade-up | fade | clip | scale | mask | slide-left"
 *   data-reveal-stagger        → direct children reveal one after another
 *   data-split="chars|words"   → split text, animated when revealed
 *   data-parallax data-speed="0.15"
 *   data-magnetic
 */
import { $$, clamp, onScroll, onResize, prefersReducedMotion, isTouchDevice, mq } from './utils.js';

/* ==========================================================================
   Scroll reveal
   ========================================================================== */
let revealObserver;

function prepareStagger(container) {
  [...container.children].forEach((child, i) => child.style.setProperty('--i', i));
}

function observeReveal(el) {
  if (el.dataset.revealBound) return;
  el.dataset.revealBound = 'true';
  if (el.hasAttribute('data-reveal-stagger')) prepareStagger(el);
  if (el.hasAttribute('data-split')) splitText(el, el.dataset.split);
  revealObserver.observe(el);
}

export function initReveal(root = document) {
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );

    // Auto-observe anything rendered later (product grids, product page…).
    new MutationObserver((mutations) => {
      mutations.forEach((m) =>
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.matches('[data-reveal], [data-reveal-stagger], [data-split]')) observeReveal(node);
          $$('[data-reveal], [data-reveal-stagger], [data-split]', node).forEach(observeReveal);
        })
      );
    }).observe(document.body, { childList: true, subtree: true });
  }

  $$('[data-reveal], [data-reveal-stagger], [data-split]', root).forEach(observeReveal);
}

/* ==========================================================================
   Text splitting
   Keeps a visually-hidden copy of the text for assistive tech and marks the
   animated spans aria-hidden. Words are wrapped so lines never break mid-word.
   ========================================================================== */
export function splitText(el, type = 'chars') {
  if (el.dataset.splitDone) return;
  el.dataset.splitDone = 'true';
  const plain = el.textContent.replace(/\s+/g, ' ').trim();
  let index = 0;

  const buildFrom = (node) => {
    const frag = document.createDocumentFragment();
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = child.textContent.split(/(\s+)/);
        parts.forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(' '));
            return;
          }
          const word = document.createElement('span');
          word.className = 'split-word';
          if (type === 'words') {
            const inner = document.createElement('span');
            inner.className = 'split-word__inner';
            inner.style.setProperty('--i', index++);
            inner.textContent = part;
            word.appendChild(inner);
          } else {
            [...part].forEach((ch) => {
              const c = document.createElement('span');
              c.className = 'split-char';
              const inner = document.createElement('span');
              inner.className = 'split-char__inner';
              inner.style.setProperty('--i', index++);
              inner.textContent = ch;
              c.appendChild(inner);
              word.appendChild(c);
            });
          }
          frag.appendChild(word);
        });
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.tagName === 'BR') {
          frag.appendChild(document.createElement('br'));
          return;
        }
        const clone = child.cloneNode(false);
        clone.appendChild(buildFrom(child));
        frag.appendChild(clone);
      }
    });
    return frag;
  };

  const visual = document.createElement('span');
  visual.className = 'split';
  visual.setAttribute('aria-hidden', 'true');
  visual.appendChild(buildFrom(el));

  const sr = document.createElement('span');
  sr.className = 'visually-hidden';
  sr.textContent = plain;

  el.replaceChildren(sr, visual);
  el.style.setProperty('--split-count', index);
  return index;
}

/* ==========================================================================
   Parallax — translateY based on distance from viewport centre
   Only elements currently on screen are updated each frame.
   ========================================================================== */
export function initParallax(selector = '[data-parallax]') {
  if (prefersReducedMotion()) return;
  const els = $$(selector);
  if (!els.length) return;

  const active = new Set();
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => (e.isIntersecting ? active.add(e.target) : active.delete(e.target))),
    { rootMargin: '20% 0px' }
  );
  els.forEach((el) => io.observe(el));

  let factor = mq('(min-width: 768px)') ? 1 : 0.5;
  onResize(() => (factor = mq('(min-width: 768px)') ? 1 : 0.5));

  onScroll(() => {
    const vh = window.innerHeight;
    active.forEach((el) => {
      // Measure the parent so our own transform doesn't feed back into the maths.
      const rect = (el.parentElement || el).getBoundingClientRect();
      const speed = parseFloat(el.dataset.speed || '0.1') * factor;
      const offset = (rect.top + rect.height / 2 - vh / 2) * speed;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    });
  });
}

/* ==========================================================================
   Magnetic buttons — gently pulled toward the pointer
   ========================================================================== */
export function initMagnetic(selector = '[data-magnetic]') {
  if (prefersReducedMotion() || isTouchDevice()) return;
  document.addEventListener('pointermove', (e) => {
    const el = e.target instanceof Element ? e.target.closest(selector) : null;
    $$(`${selector}.is-magnetized`).forEach((m) => {
      if (m !== el) {
        m.classList.remove('is-magnetized');
        m.style.transform = '';
      }
    });
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * 0.25;
    const y = (e.clientY - (r.top + r.height / 2)) * 0.35;
    el.classList.add('is-magnetized');
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, { passive: true });
}

/* ==========================================================================
   Count-up
   ========================================================================== */
const easeOutExpo = (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t));

export function countUp(el, to, { duration = 2000, decimals = 0, format } = {}) {
  const fmt = format || ((v) => v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
  if (prefersReducedMotion()) {
    el.textContent = fmt(to);
    return;
  }
  const start = performance.now();
  const tick = (now) => {
    const t = clamp((now - start) / duration);
    el.textContent = fmt(to * easeOutExpo(t));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ==========================================================================
   Confetti — lightweight canvas particle burst
   ========================================================================== */
export function confetti({ count = 180, duration = 4200 } = {}) {
  if (prefersReducedMotion()) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  const styles = getComputedStyle(document.documentElement);
  const colors = [
    styles.getPropertyValue('--c-accent').trim() || '#c6ff3d',
    styles.getPropertyValue('--c-paper').trim() || '#f4f1ea',
    styles.getPropertyValue('--c-muted').trim() || '#8c8577',
    '#ff7a45',
    '#7a5cff',
    '#111112',
  ];

  const particles = Array.from({ length: count }, (_, i) => {
    const fromLeft = i % 2 === 0;
    return {
      x: fromLeft ? -10 : W + 10,
      y: H * (0.55 + Math.random() * 0.25),
      vx: (fromLeft ? 1 : -1) * (6 + Math.random() * 10),
      vy: -(10 + Math.random() * 12),
      w: 6 + Math.random() * 8,
      h: 8 + Math.random() * 12,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
      color: colors[i % colors.length],
      shape: Math.random() > 0.7 ? 'circle' : 'rect',
      wobble: Math.random() * 10,
    };
  });

  const start = performance.now();
  const frame = (now) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, W, H);
    particles.forEach((p) => {
      p.vy += 0.32;           // gravity
      p.vx *= 0.985;          // air drag
      p.vy *= 0.985;
      p.wobble += 0.12;
      p.x += p.vx + Math.sin(p.wobble) * 0.8;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = clamp(1 - (elapsed - duration * 0.65) / (duration * 0.35));
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.wobble)));
      }
      ctx.restore();
    });
    if (elapsed < duration) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
