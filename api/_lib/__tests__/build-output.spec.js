import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Does the build actually serve the app?
//
// This is a different question from "did the build succeed", and the failure
// mode is nasty: `expo start` serves the generated shell and looks perfect,
// while `expo export` copies public/ over the output afterwards. So the app can
// be completely unreachable in production with a green local run.
//
// That is not hypothetical. The mobile repo keeps a deep-link interstitial at
// public/index.html which redirects to archiveszone.app after five seconds. It
// belongs to link.archiveszone.app, not here - see public/README.md.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DIST = join(ROOT, 'dist');
const hasDist = existsSync(DIST);

function dirSize(dir) {
  let total = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    total += st.isDirectory() ? dirSize(full) : st.size;
  }
  return total;
}

describe.skipIf(!hasDist)('the build serves the app', () => {
  it('dist/index.html is the app shell, not the deep-link interstitial', () => {
    const html = readFileSync(join(DIST, 'index.html'), 'utf8');

    // The shell mounts the app.
    expect(html).toMatch(/id="root"/);
    // The interstitial's fingerprints. Any of these means public/ won.
    expect(html).not.toMatch(/Opening Archives/);
    expect(html).not.toMatch(/archives:\//);
    expect(html).not.toMatch(/apps\.apple\.com/);
  });

  it('the app bundle is actually present and referenced', () => {
    const html = readFileSync(join(DIST, 'index.html'), 'utf8');
    const script = html.match(/src="([^"]*_expo[^"]*\.js)"/);
    expect(script, 'index.html references no _expo bundle').not.toBeNull();

    const bundle = join(DIST, script[1].replace(/^\//, ''));
    expect(existsSync(bundle), `${script[1]} is referenced but missing`).toBe(true);
    // A bundle this small is a build that emitted a stub rather than the app.
    expect(statSync(bundle).size).toBeGreaterThan(100_000);
  });

  it('nothing in public/ shadows a route the app owns', () => {
    // public/ is copied over the build output and is served ahead of the SPA
    // rewrite, so a name collision silently takes a route away from the app.
    // index.html is the one that matters most - it takes the whole app.
    const OWNED = ['index.html', 'adventure', 'lesson', 'quiz', 'profile', 'today', 'era'];
    const entries = readdirSync(join(ROOT, 'public'));
    const shadowed = entries.filter((f) => OWNED.includes(f.replace(/\.html$/, '')) || OWNED.includes(f));
    expect(shadowed).toEqual([]);
  });

  it('stays inside a first-load budget', () => {
    // The vanilla app it replaces was 9.3k lines with no build step. Trading a
    // broken video for a bounced user is not a win, so the JS payload is
    // bounded here rather than discovered after launch. Raise deliberately.
    const jsBytes = dirSize(join(DIST, '_expo'));
    expect(jsBytes).toBeLessThan(12 * 1024 * 1024);
  });
});

// A missing dist/ skips every assertion above, so in CI - where the build always
// runs first - its absence has to be a failure rather than a silent pass.
describe.skipIf(!process.env.CI)('the build exists in CI', () => {
  it('dist/ was built before the scan ran', () => {
    expect(hasDist).toBe(true);
  });
});
