import { isSignedIn } from './auth.js';
import { getDirection, transitionOut, transitionIn, initGlobalAnimations } from './animations.js';

let currentCleanup = null;
let isTransitioning = false;

const routes = [];

export function route(pattern, handler) {
  // Convert :param patterns to regex
  const keys = [];
  const regex = new RegExp(
    '^' +
    pattern.replace(/:(\w+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    }) +
    '$'
  );
  routes.push({ regex, keys, handler });
}

export function navigate(hash) {
  window.location.hash = hash;
}

function resolve() {
  if (!isSignedIn()) return;
  if (isTransitioning) return;

  const rawHash = window.location.hash.slice(1) || '/';
  const hash = rawHash.split('?')[0]; // Strip query params

  for (const r of routes) {
    const match = hash.match(r.regex);
    if (match) {
      const params = {};
      r.keys.forEach((key, i) => {
        params[key] = decodeURIComponent(match[i + 1]);
      });

      const direction = getDirection(hash);
      const app = document.getElementById('app');

      // If app has content, animate out then swap
      if (app.children.length > 0) {
        isTransitioning = true;
        app._transDir = direction;

        // Safety timeout in case GSAP hangs
        var transTimeout = setTimeout(() => { isTransitioning = false; }, 1000);

        transitionOut(app).then(() => {
          clearTimeout(transTimeout);
          // Clean up previous view
          if (currentCleanup) {
            currentCleanup();
            currentCleanup = null;
          }

          app.innerHTML = '';
          const cleanup = r.handler(app, params);
          if (typeof cleanup === 'function') currentCleanup = cleanup;

          transitionIn(app, direction);
          isTransitioning = false;
        });
      } else {
        // First render — no outgoing animation needed
        if (currentCleanup) {
          currentCleanup();
          currentCleanup = null;
        }

        app.innerHTML = '';
        const cleanup = r.handler(app, params);
        if (typeof cleanup === 'function') currentCleanup = cleanup;

        transitionIn(app, direction);
      }
      return;
    }
  }

  // Fallback: redirect to home
  navigate('/');
}

export function forceResolve() {
  resolve();
}

export function startRouter() {
  initGlobalAnimations();
  window.addEventListener('hashchange', resolve);

  // Esc key navigates back
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      // Don't interfere with inputs or modals handled elsewhere
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      var back = document.querySelector('.header__back');
      if (back && back.href) {
        e.preventDefault();
        window.location.hash = back.getAttribute('href').replace(/^#/, '#');
      }
    }
  });

  resolve();
}
