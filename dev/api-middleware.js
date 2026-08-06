// Serves api/ from the Expo dev server, so local development has one origin.
//
// Development only. Never bundled, never shipped: metro.config.js is a build
// tool config, and Vercel runs the real functions in production.
//
// The alternative was `vercel dev` on a second port, which fails in a way that
// wastes an afternoon: /api/* deliberately sends no Access-Control-Allow-Origin
// (correct - only the app should call it), so a cross-origin fetch from
// localhost:8081 is blocked by the browser. Same origin sidesteps that
// entirely, and it exercises the real handler modules rather than a mock.
//
// Vercel's file-based routing is reimplemented here closely enough for that to
// mean something: static segments win over dynamic, dynamic over catch-all,
// which is the order Vercel resolves in.

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const API_DIR = path.join(__dirname, '..', 'api');

/**
 * Finds the handler for a URL path, mimicking Vercel's resolution order.
 *
 * `/api/db/rest/v1/eras` -> api/db/[...path].js with params {path: [...]}
 * `/api/daily/2026-08-06` -> api/daily/[date].js with params {date: '...'}
 * `/api/daily/today`      -> api/daily/today.js (static beats dynamic)
 */
function resolveRoute(segments) {
  let dir = API_DIR;
  const params = {};

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isLast = i === segments.length - 1;

    if (isLast) {
      // Static file, e.g. daily/today.js
      const staticFile = path.join(dir, `${segment}.js`);
      if (fs.existsSync(staticFile)) return { file: staticFile, params };

      // Directory with an index, e.g. progress/index.js
      const indexFile = path.join(dir, segment, 'index.js');
      if (fs.existsSync(indexFile)) return { file: indexFile, params };
    }

    const nextDir = path.join(dir, segment);
    if (fs.existsSync(nextDir) && fs.statSync(nextDir).isDirectory()) {
      dir = nextDir;
      continue;
    }

    // No static match - look for [param].js or [...catchAll].js in this dir.
    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return null;
    }

    const catchAll = entries.find((e) => e.startsWith('[...') && e.endsWith('.js'));
    if (catchAll) {
      const name = catchAll.slice(4, -4);
      params[name] = segments.slice(i);
      return { file: path.join(dir, catchAll), params };
    }

    const dynamic = entries.find(
      (e) => e.startsWith('[') && !e.startsWith('[...') && e.endsWith('].js')
    );
    if (dynamic && isLast) {
      params[dynamic.slice(1, -4)] = segment;
      return { file: path.join(dir, dynamic), params };
    }

    return null;
  }

  const indexFile = path.join(dir, 'index.js');
  return fs.existsSync(indexFile) ? { file: indexFile, params } : null;
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(undefined);
      // Vercel parses JSON bodies for the handler; anything else stays raw.
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(raw);
      }
    });
  });
}

/** Adds the bits of Vercel's response object the handlers actually use. */
function decorate(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.send = (body) => {
    res.end(body);
    return res;
  };
  res.json = (body) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
    return res;
  };
  return res;
}

module.exports = function apiMiddleware(middleware) {
  return async (req, res, next) => {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return middleware(req, res, next);

    const segments = url.pathname.slice(5).split('/').filter(Boolean);
    const route = resolveRoute(segments);

    if (!route) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: `No API route for ${url.pathname}` }));
    }

    try {
      // Imported fresh each request so editing a handler does not need a
      // restart - the whole point of running it in the dev server.
      const mod = await import(`${pathToFileURL(route.file).href}?t=${Date.now()}`);
      const handler = mod.default;

      req.query = { ...route.params };
      for (const [k, v] of url.searchParams) {
        if (!(k in req.query)) req.query[k] = v;
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        req.body = await readBody(req);
      }

      await handler(req, decorate(res));
    } catch (err) {
      // Logged loudly: a 500 from here is a bug in the handler, and silence
      // would send you looking in the browser instead.
      console.error(`[api] ${req.method} ${url.pathname} failed:`, err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: String(err && err.message) }));
      }
    }
  };
};
