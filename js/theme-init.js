/**
 * DRIFTLINE — Render-blocking bootstrap (classic script, loaded in <head>).
 * Runs before first paint to avoid a theme flash, and flags JS support.
 * Kept tiny on purpose; everything else lives in ES modules.
 */
(function () {
  var root = document.documentElement;
  root.classList.add('js');

  // 1. Theme: dark by default, user choice remembered.
  var theme = 'dark';
  try {
    var saved = JSON.parse(localStorage.getItem('driftline-theme'));
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch (e) { /* storage blocked */ }
  root.setAttribute('data-theme', theme);

  // 2. Preloader only on the first home visit of a session.
  try {
    if (sessionStorage.getItem('driftline-preloaded')) root.classList.add('skip-preloader');
  } catch (e) { /* ignore */ }

  // 3. Safety net: if the module bundle never boots (e.g. opened via file://),
  //    reveal all content instead of leaving hidden "reveal" elements invisible.
  setTimeout(function () {
    if (!window.__driftlineReady) {
      root.classList.remove('js');
      root.classList.add('is-ready', 'skip-preloader', 'no-module');
    }
  }, 3500);

  if (location.protocol === 'file:') {
    document.addEventListener('DOMContentLoaded', function () {
      var note = document.createElement('p');
      note.className = 'file-notice';
      note.setAttribute('role', 'status');
      note.textContent =
        'Heads up: this site uses ES modules, which browsers block on file://. Run it with a local server (e.g. VS Code Live Server or "npx serve") to enable cart, filters and animations.';
      document.body.appendChild(note);
    });
  }
})();
