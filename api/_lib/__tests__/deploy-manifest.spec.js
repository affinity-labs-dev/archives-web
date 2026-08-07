import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// The test that says the deploy publishes only the web app.
//
// vercel.json sets outputDirectory ".", so a deploy serves the repo root, and
// this repo also holds the mobile app's source. .vercelignore is the only
// thing standing between the two.
//
// It was a denylist once. Everything nobody had thought to name went out:
// backend/src/prompts.ts, gamification/, hooks/, eas.json, and a
// google-services.json carrying a live Firebase key - all fetchable over plain
// HTTP on beta. Nothing failed, nothing warned; the files were simply there.
//
// A denylist cannot be tested into safety, because the dangerous case is the
// directory that does not exist yet. So .vercelignore denies everything and
// names what ships, and this pins that list. Adding a top-level directory to
// the deploy now means editing this file too, on purpose, in the same commit.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const IGNORE = join(ROOT, '.vercelignore');

/** The rules, comments and blank lines dropped. */
function rules() {
  return readFileSync(IGNORE, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

/** Everything re-included by a `!` rule, without the marker. */
function allowed() {
  return rules()
    .filter((l) => l.startsWith('!'))
    .map((l) => l.slice(1));
}

// Exactly what the browser and the functions need, and nothing else. Checked
// against index.html's own references below, so this cannot drift into a list
// that is merely plausible.
const EXPECTED = ['/index.html', '/favicon.ico', '/CNAME', '/vercel.json', '/js', '/css', '/assets', '/api'];

describe('.vercelignore', () => {
  it('denies everything before it allows anything', () => {
    // Without a leading /* the ! rules are decoration: nothing is excluded, so
    // nothing needs re-including, and the whole repo ships exactly as it did
    // when this was a denylist.
    expect(rules()[0]).toBe('/*');
  });

  it('publishes exactly the web app', () => {
    expect(allowed().sort()).toEqual([...EXPECTED].sort());
  });

  it('keeps the mobile app source out', () => {
    // Named rather than derived, because the point of the test is to fail
    // loudly if one of these is ever added back to the allowlist. Only the
    // ones actually present in the repo are asserted, so this stays honest if
    // the mobile source is ever split back out.
    const mobile = [
      'app', 'app_full', 'components', 'hooks', 'stores', 'services', 'context',
      'gamification', 'backend', 'ios', 'android', 'modules', 'plugins',
      'web-stubs', 'dist', 'scripts', 'supabase', 'docs', 'targets', 'patches',
      'analytics', 'constants', 'types', 'utils', 'config', 'dev', 'public',
    ].filter((d) => existsSync(join(ROOT, d)));

    expect(mobile.length).toBeGreaterThan(0);
    for (const dir of mobile) {
      expect(allowed(), `${dir}/ is in the deploy`).not.toContain(`/${dir}`);
    }
  });

  it('keeps the mobile build config out', () => {
    // google-services.json carries a live Firebase API key; the rest is build
    // and signing configuration that has no business on a public origin.
    for (const f of ['google-services.json', 'app.config.ts', 'app.json', 'eas.json', 'metro.config.js', 'babel.config.js']) {
      if (!existsSync(join(ROOT, f))) continue;
      expect(allowed(), `${f} is in the deploy`).not.toContain(`/${f}`);
    }
  });

  it('ships every root file index.html asks for', () => {
    // The failure this catches is the opposite one: an allowlist so tight the
    // site 404s its own stylesheet. Relative references only - CDN and font
    // hosts are somebody else's problem.
    const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
    const refs = [...html.matchAll(/(?:src|href)="(?!https?:|\/\/|data:|#)([^"?]+)/g)].map((m) => m[1]);

    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      const top = '/' + ref.replace(/^\.?\//, '').split('/')[0];
      expect(allowed(), `index.html loads ${ref}, which the deploy excludes`).toContain(top);
    }
  });

  it('leaves the function tests behind', () => {
    // api/ ships whole, so its tests need excluding by name or they become
    // public reading - and they describe the auth and entitlement checks.
    expect(rules()).toContain('/api/**/__tests__');
  });

  it('does not rely on a root package.json', () => {
    // The root package.json is Expo's, with 76 dependencies and a postinstall.
    // It is not in the allowlist, so Vercel installs nothing - which is only
    // safe while the functions import node builtins and each other. If one
    // ever needs an npm package, this test is the thing that should stop it
    // silently 500ing in production.
    const bare = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '__tests__') continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.js')) {
          for (const m of readFileSync(full, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)) {
            const spec = m[1];
            if (!spec.startsWith('.') && !spec.startsWith('node:')) bare.push(`${entry.name}: ${spec}`);
          }
        }
      }
    };
    walk(join(ROOT, 'api'));

    expect(bare).toEqual([]);
  });
});
