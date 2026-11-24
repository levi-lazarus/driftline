/**
 * DRIFTLINE — Custom cursor
 * A dot that tracks the pointer exactly + a ring that follows with easing.
 * The ring grows over interactive elements and shows a label for
 * [data-cursor="view"] / [data-cursor="drag"]. Disabled on touch devices
 * and when the user prefers reduced motion.
 */
import { $, lerp, isTouchDevice, prefersReducedMotion } from './utils.js';

const INTERACTIVE = 'a, button, [role="button"], label, select, summary, input[type="range"], input[type="checkbox"], input[type="radio"], [data-cursor]';
const TEXT_INPUT = 'input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]), textarea';
const LABELS = { view: 'View', drag: 'Drag', play: 'Play' };

export function initCursor() {
  const root = $('[data-cursor-root]');
  if (!root) return;
  if (isTouchDevice() || prefersReducedMotion()) {
    root.remove();
    return;
  }

  const dot = $('.cursor__dot', root);
  const ring = $('.cursor__ring', root);
  const label = $('[data-cursor-label]', root);
  document.documentElement.classList.add('has-cursor');

  const mouse = { x: -100, y: -100 };
  const ringPos = { x: -100, y: -100 };
  let rafId = null;
  let visible = false;

  function render() {
    ringPos.x = lerp(ringPos.x, mouse.x, 0.2);
    ringPos.y = lerp(ringPos.y, mouse.y, 0.2);
    dot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
    ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;

    // Stop the loop once the ring has caught up — no idle CPU usage.
    if (Math.abs(ringPos.x - mouse.x) < 0.1 && Math.abs(ringPos.y - mouse.y) < 0.1) {
      rafId = null;
      return;
    }
    rafId = requestAnimationFrame(render);
  }

  const start = () => {
    if (!rafId) rafId = requestAnimationFrame(render);
  };

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (!visible) {
        // Jump the ring to the pointer on first move so it doesn't fly in from 0,0.
        ringPos.x = mouse.x;
        ringPos.y = mouse.y;
        root.classList.add('is-visible');
        visible = true;
      }
      start();
    },
    { passive: true }
  );

  document.addEventListener('pointerover', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    const textField = target.closest(TEXT_INPUT);
    const special = target.closest('[data-cursor]');
    const interactive = target.closest(INTERACTIVE);

    root.classList.toggle('is-text', Boolean(textField));
    root.classList.toggle('is-hover', Boolean(interactive) && !special);
    const type = special?.dataset.cursor;
    root.classList.toggle('is-label', Boolean(type && LABELS[type]));
    label.textContent = type ? special.dataset.cursorLabel || LABELS[type] || '' : '';
  });

  document.addEventListener('pointerdown', () => root.classList.add('is-down'));
  document.addEventListener('pointerup', () => root.classList.remove('is-down'));
  document.documentElement.addEventListener('pointerleave', () => {
    root.classList.remove('is-visible');
    visible = false;
  });

  // Reset hover state after page changes (e.g. elements re-rendered under the pointer).
  window.addEventListener('blur', () => root.classList.remove('is-hover', 'is-label', 'is-down'));
}
