/**
 * DRIFTLINE — Contact page
 * Inline-validated contact form with live character counter and an
 * animated success state (simulated request — no backend).
 */
import { attachValidation, toast } from './ui.js';
import { $, $$, wait } from './utils.js';

export function init() {
  const form = $('[data-contact-form]');
  if (!form) return;
  const success = $('[data-contact-success]');
  const successText = $('[data-contact-success-text]');
  const message = $('#ct-message', form);
  const counter = $('[data-char-count]', form);
  const max = Number(message.getAttribute('maxlength'));
  const validateAll = attachValidation(form);

  const updateCount = () => {
    const n = message.value.length;
    counter.textContent = `${n} / ${max}`;
    counter.classList.toggle('is-near-limit', n > max * 0.9);
  };
  message.addEventListener('input', updateCount);
  updateCount();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateAll()) return;

    const btn = $('[data-contact-submit]', form);
    const label = btn.innerHTML;
    btn.classList.add('is-loading');
    btn.innerHTML = '<span class="btn__spinner" aria-hidden="true"></span> Sending…';
    await wait(1200); // simulated request

    const name = form.elements.name.value.trim().split(/\s+/)[0];
    const email = form.elements.email.value.trim();
    successText.textContent = `Thanks, ${name}! We'll reply to ${email} within one working day.`;
    form.hidden = true;
    success.hidden = false;
    success.focus();
    toast('Message sent — talk soon.');

    btn.classList.remove('is-loading');
    btn.innerHTML = label;
    form.reset();
    $$('.field', form).forEach((f) => f.classList.remove('is-valid', 'has-error'));
    $$('[data-touched]', form).forEach((el) => delete el.dataset.touched);
    updateCount();
  });

  $('[data-contact-reset]').addEventListener('click', () => {
    success.hidden = true;
    form.hidden = false;
    form.querySelector('input')?.focus();
  });
}
