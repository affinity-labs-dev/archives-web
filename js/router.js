import { isSignedIn } from './auth.js';

let currentCleanup = null;

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

  const rawHash = window.location.hash.slice(1) || '/';
  const hash = rawHash.split('?')[0]; // Strip query params

  for (const r of routes) {
    const match = hash.match(r.regex);
    if (match) {
      const params = {};
      r.keys.forEach((key, i) => {
        params[key] = decodeURIComponent(match[i + 1]);
      });

      // Clean up previous view
      if (currentCleanup) {
        currentCleanup();
        currentCleanup = null;
      }

      const app = document.getElementById('app');
      app.innerHTML = '';
      const cleanup = r.handler(app, params);
      if (typeof cleanup === 'function') currentCleanup = cleanup;
      return;
    }
  }

  // Fallback: redirect to home
  navigate('/');
}

export function startRouter() {
  window.addEventListener('hashchange', resolve);
  resolve();
}
