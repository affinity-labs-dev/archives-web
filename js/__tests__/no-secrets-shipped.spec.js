import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// The test that says the backend migration actually worked.
//
// Everything the browser downloads is public: an environment variable does not
// help, because the build inlines it. So the only real check is to read what
// ships and confirm no credential is in it.
//
// This guards two specific regressions that were live:
//   - the Supabase anon key, hardcoded in js/api.js
//   - a billable Google Gemini key, hardcoded in js/services/gemini.js and put
//     in a request URL, which anyone could lift and spend money with

// fileURLToPath, not URL.pathname: this repo's path contains spaces, which
// import.meta.url percent-encodes.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Directories whose contents are served to browsers.
const SHIPPED_DIRS = ['js', 'css'];
const SHIPPED_FILES = ['index.html'];
const EXTENSIONS = new Set(['.js', '.css', '.html', '.json']);

// api/ is server-only and legitimately reads secrets from process.env, so it is
// excluded. Tests are not shipped either.
const EXCLUDED = ['__tests__', 'node_modules'];

function shippedFiles() {
  const out = SHIPPED_FILES.map((f) => join(ROOT, f));

  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (EXCLUDED.includes(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (EXTENSIONS.has(extname(entry))) out.push(full);
    }
  };

  for (const dir of SHIPPED_DIRS) walk(join(ROOT, dir));
  return out;
}

const PATTERNS = [
  // Google API keys: "AIza" then 35 more characters.
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  // A Supabase JWT: the header of any HS256 JWT, which is what the anon and
  // service keys both are.
  { name: 'Supabase key (JWT)', re: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/ },
  // Supabase service-role keys and RevenueCat/Clerk secrets.
  { name: 'service_role reference', re: /service_role/ },
  { name: 'RevenueCat secret key', re: /\bsk_[A-Za-z0-9]{20,}\b/ },
  { name: 'Clerk secret key', re: /\bsk_(live|test)_[A-Za-z0-9]{20,}\b/ },
];

describe('nothing secret ships to the browser', () => {
  const files = shippedFiles();

  it('finds files to check', () => {
    // A silently empty file list would make every assertion below vacuous.
    expect(files.length).toBeGreaterThan(10);
  });

  for (const { name, re } of PATTERNS) {
    it(`no ${name} in any shipped asset`, () => {
      const offenders = files
        .filter((f) => re.test(readFileSync(f, 'utf8')))
        .map((f) => f.slice(ROOT.length));
      expect(offenders).toEqual([]);
    });
  }

  it('no direct Supabase calls remain in the client', () => {
    // The client must go through /api/*; a stray PostgREST call would need a
    // key, which is how this started.
    const offenders = files
      .filter((f) => /supabase\.co\/rest\/v1/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(ROOT.length));
    expect(offenders).toEqual([]);
  });

  it('no direct Gemini calls remain in the client', () => {
    const offenders = files
      .filter((f) => /generativelanguage\.googleapis\.com/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(ROOT.length));
    expect(offenders).toEqual([]);
  });
});
