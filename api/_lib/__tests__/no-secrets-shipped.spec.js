import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// The test that says the build is safe to publish.
//
// Everything a browser downloads is public. An environment variable does not
// help: Metro inlines every EXPO_PUBLIC_* value into the bundle as a literal.
// So the only honest check is to read what actually ships and look.
//
// This replaces the vanilla app's js/-scanning version. That one guarded a real
// incident - the Supabase anon key hardcoded in js/api.js and a billable Gemini
// key in js/services/gemini.js, sitting in a request URL for anyone to lift.
// Scanning dist/ instead is strictly stronger: it sees what the compiler
// produced rather than what the source looked like.
//
// Wired into the Vercel build, so a failure here fails the deploy.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DIST = join(ROOT, 'dist');

// Text formats a credential could hide in. Fonts, images and video cannot
// meaningfully carry one and are large enough to slow the scan noticeably.
const EXTENSIONS = new Set(['.js', '.mjs', '.css', '.html', '.json', '.map', '.txt']);

function distFiles() {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (EXTENSIONS.has(extname(entry))) out.push(full);
    }
  };
  walk(DIST);
  return out;
}

// No trailing \b on the length-based patterns. In a minified bundle a literal
// can butt up against surrounding characters, and a trailing boundary turns
// that into a miss. False positives here cost a minute; a miss costs a
// credential, so these lean deliberately towards over-matching.
const PATTERNS = [
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}/ },
  // The header of any HS256 JWT, which is what Supabase anon and service keys
  // both are on older projects.
  { name: 'Supabase key (JWT)', re: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/ },
  // Newer Supabase projects do not issue HS256 JWTs at all, so the pattern
  // above would miss them entirely.
  { name: 'Supabase key (sb_ format)', re: /\bsb_(publishable|secret)_[A-Za-z0-9_-]{20,}/ },
  { name: 'service_role reference', re: /service_role/ },
  { name: 'Clerk secret key', re: /\bsk_(live|test)_[A-Za-z0-9]{20,}/ },
  // Deliberately after the Clerk rule, which is the more specific case.
  { name: 'generic secret key', re: /\bsk_[A-Za-z0-9]{24,}/ },
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}/ },
  { name: 'private key block', re: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/ },
];

/**
 * A sample each pattern must match, and one it must not.
 *
 * Without this the patterns are unfalsifiable: they pass on every clean build
 * whether or not they still work, so a typo would disarm the gate silently and
 * the suite would stay green forever. Found the hard way - the Google rule was
 * first tested with a 37-character sample and appeared not to fire.
 */
const PATTERN_SAMPLES = {
  'Google API key': {
    hit: 'AIza' + 'B'.repeat(35),
    miss: 'AIza' + 'B'.repeat(10),
  },
  'Supabase key (JWT)': {
    hit: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig',
    miss: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9',
  },
  'Supabase key (sb_ format)': {
    hit: 'sb_secret_' + 'a'.repeat(24),
    miss: 'sb_secret_short',
  },
  'service_role reference': { hit: '{"role":"service_role"}', miss: 'anon role' },
  'Clerk secret key': { hit: 'sk_live_' + 'a'.repeat(24), miss: 'sk_live_short' },
  'generic secret key': { hit: 'sk_' + 'a'.repeat(30), miss: 'sk_tiny' },
  'AWS access key id': { hit: 'AKIA' + 'A'.repeat(16), miss: 'AKIA123' },
  'private key block': {
    hit: '-----BEGIN RSA PRIVATE KEY-----',
    miss: '-----BEGIN CERTIFICATE-----',
  },
};

/**
 * Every EXPO_PUBLIC_* name allowed to reach a browser, and why.
 *
 * The enumeration is the point. Metro inlines these silently, so without a list
 * that must be edited, a new one arrives in the bundle and nobody reviews it.
 * Adding a name here should feel like a decision.
 */
const ALLOWED_PUBLIC_VARS = new Set([
  // Clerk publishable keys are designed to be public and are origin-locked.
  'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
  // PostHog project keys are write-only ingestion keys, meant for clients.
  'EXPO_PUBLIC_POSTHOG_API_KEY',
  'EXPO_PUBLIC_POSTHOG_HOST',
  // RevenueCat SDK keys are publishable by design (hooks/useRevenueCat.ts:16-18).
  'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY',
  'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY',
  // Plain origins, not credentials.
  'EXPO_PUBLIC_API_ORIGIN',
  'EXPO_PUBLIC_BACKEND_URL',
  'EXPO_PUBLIC_AFFINITY_API_URL',
  'EXPO_PUBLIC_AFFINITY_APP_ID',
  //
  // NOT allowed, and the reason this list exists:
  //
  //   EXPO_PUBLIC_AFFINITY_API_KEY  - scoped users:write + devices:write, sent
  //     as a bearer token. Kept out of the bundle by
  //     services/AffinityNotificationService.web.ts. If this test fails on that
  //     name, something imported the native module on web - fix the import, do
  //     not add it here.
  //
  //   EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY - the web build talks to /api/db and
  //     holds no database credential. hooks/lib/supabase.web.ts is what keeps
  //     these out; seeing them means the native client got bundled.
]);

// Runs whether or not a build exists: the patterns are the gate, and they must
// be verified even when there is nothing to scan.
describe('the patterns themselves still work', () => {
  for (const { name, re } of PATTERNS) {
    it(`${name} matches a real sample and ignores a near miss`, () => {
      const sample = PATTERN_SAMPLES[name];
      // Every pattern needs a sample; a new rule without one is unverified.
      expect(sample, `no sample defined for "${name}"`).toBeDefined();
      expect(re.test(sample.hit), `should match: ${sample.hit}`).toBe(true);
      expect(re.test(sample.miss), `should not match: ${sample.miss}`).toBe(false);
    });
  }
});

const hasDist = existsSync(DIST);

/**
 * Whether the process carries the values the build was given.
 *
 * The value scan can only look for values it has. Requires a *usable* one, not
 * merely a defined name: CI sets unconfigured variables to empty strings, so
 * counting names would report a healthy environment while checking nothing.
 */
const hasBuildEnv = Object.entries(process.env).some(
  ([k, v]) => k.startsWith('EXPO_PUBLIC_') && v && v.length >= 12
);

describe.skipIf(!hasDist)('nothing secret ships to the browser', () => {
  const files = hasDist ? distFiles() : [];

  it('has a build to check', () => {
    // A silently empty file list makes every assertion below vacuous - the
    // classic way a security test passes forever while checking nothing.
    expect(files.length).toBeGreaterThan(5);
    expect(files.some((f) => f.endsWith('.js'))).toBe(true);
  });

  for (const { name, re } of PATTERNS) {
    it(`no ${name} in the build`, () => {
      const offenders = files
        .filter((f) => re.test(readFileSync(f, 'utf8')))
        .map((f) => f.slice(DIST.length + 1));
      expect(offenders).toEqual([]);
    });
  }

  // Scanning for variable NAMES is close to useless on its own, which is worth
  // stating because it looks like it should work. Metro replaces every
  // `process.env.EXPO_PUBLIC_X` in our code with the literal value, so the name
  // vanishes and only the secret survives. The names that do appear in dist/
  // belong to third-party libraries reading env at runtime - Clerk ships
  // `process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || ...` in its own source.
  //
  // So the check that matters is the other direction: take the values the build
  // had available and look for those.
  it.skipIf(!hasBuildEnv)('no unreviewed EXPO_PUBLIC_* value reached the build', () => {
    const bundle = files.map((f) => readFileSync(f, 'utf8')).join('\n');

    const leaked = [];
    for (const [name, value] of Object.entries(process.env)) {
      if (!name.startsWith('EXPO_PUBLIC_')) continue;
      // Short values produce false positives against minified code, and are
      // not credentials anyway.
      if (!value || value.length < 12) continue;
      if (!bundle.includes(value)) continue;
      if (ALLOWED_PUBLIC_VARS.has(name)) continue;
      leaked.push(name);
    }

    expect(leaked).toEqual([]);
  });

  it('names appearing in the build are still reviewed', () => {
    // Weak on its own, per the note above, but it costs nothing and it is the
    // one signal that catches a library reading a variable we never audited.
    const found = new Set();
    for (const file of files) {
      for (const m of readFileSync(file, 'utf8').matchAll(/EXPO_PUBLIC_[A-Z0-9_]+/g)) {
        found.add(m[0]);
      }
    }
    const unreviewed = [...found].filter((v) => !ALLOWED_PUBLIC_VARS.has(v));
    expect(unreviewed).toEqual([]);
  });

  it('no direct Supabase REST call remains in the client', () => {
    // The browser must go through /api/db. A stray PostgREST URL means
    // something bypassed the proxy, and that request would need a key.
    const offenders = files
      .filter((f) => /supabase\.co\/rest\/v1/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(DIST.length + 1));
    expect(offenders).toEqual([]);
  });

  it('no direct Gemini call remains in the client', () => {
    const offenders = files
      .filter((f) => /generativelanguage\.googleapis\.com/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(DIST.length + 1));
    expect(offenders).toEqual([]);
  });
});

// Guards the guard. `describe.skipIf` means a missing dist/ silently skips every
// assertion above, so in CI - where the build always runs first - absence of a
// build must itself be a failure. Locally it stays a skip so `npm test` works
// without a five-minute export.
// Guards the guards. Both scans above degrade to a skip when something is
// missing - no dist/, or no build env - which is right for `npm test` on a
// laptop and catastrophic in CI, where a skipped security scan is
// indistinguishable from a passing one. CI is where they must be mandatory.
describe.skipIf(!process.env.CI)('the scans actually ran in CI', () => {
  it('dist/ was built before the scan', () => {
    expect(hasDist, 'no dist/ - build before scanning, or the scan checks nothing').toBe(true);
  });

  it('the build environment was present, so the value scan had something to find', () => {
    expect(
      hasBuildEnv,
      'no usable EXPO_PUBLIC_* value in env - the value scan silently checked nothing'
    ).toBe(true);
  });
});
