import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock auth.js since router imports it
vi.mock('../auth.js', () => ({
  isSignedIn: vi.fn(() => true),
}));

import { route, navigate, forceResolve, startRouter } from '../router.js';
import { isSignedIn } from '../auth.js';

// Because the router module has module-level state (routes array),
// we test the pattern-matching logic by registering routes and resolving.

describe('Router', () => {
  let handler;

  beforeEach(() => {
    handler = vi.fn();
    vi.clearAllMocks();
    // Provide an #app element
    document.body.innerHTML = '<div id="app"></div>';
    isSignedIn.mockReturnValue(true);
  });

  it('matches a simple route', () => {
    route('/test-simple', handler);
    window.location.hash = '#/test-simple';
    forceResolve();
    expect(handler).toHaveBeenCalled();
  });

  it('extracts :param from route', () => {
    route('/adventure/:readableId', handler);
    window.location.hash = '#/adventure/prophets_1';
    forceResolve();
    expect(handler).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ readableId: 'prophets_1' })
    );
  });

  it('extracts multiple params', () => {
    route('/lesson/:readableId/:moduleIndex', handler);
    window.location.hash = '#/lesson/prophets_2/3';
    forceResolve();
    expect(handler).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ readableId: 'prophets_2', moduleIndex: '3' })
    );
  });

  it('decodes URI-encoded params', () => {
    route('/era/:eraId', handler);
    window.location.hash = '#/era/prophets%202';
    forceResolve();
    expect(handler).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ eraId: 'prophets 2' })
    );
  });

  it('does not resolve when not signed in', () => {
    isSignedIn.mockReturnValue(false);
    route('/auth-test', handler);
    window.location.hash = '#/auth-test';
    forceResolve();
    expect(handler).not.toHaveBeenCalled();
  });

  it('calls cleanup from previous view', () => {
    const cleanup = vi.fn();
    const handler1 = vi.fn(() => cleanup);
    const handler2 = vi.fn();

    route('/view-a-cleanup', handler1);
    route('/view-b-cleanup', handler2);

    window.location.hash = '#/view-a-cleanup';
    forceResolve();
    expect(cleanup).not.toHaveBeenCalled();

    window.location.hash = '#/view-b-cleanup';
    forceResolve();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('navigate sets the hash', () => {
    navigate('/settings');
    expect(window.location.hash).toBe('#/settings');
  });

  it('strips query params before matching', () => {
    route('/query-test/:id', handler);
    window.location.hash = '#/query-test/abc?foo=bar&baz=1';
    forceResolve();
    expect(handler).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ id: 'abc' })
    );
  });

  it('falls back to / for unmatched routes', () => {
    // Register a known route so we can detect the fallback navigate
    window.location.hash = '#/this-route-does-not-exist-xyz';
    forceResolve();
    // Fallback calls navigate('/'), which sets hash to #/
    expect(window.location.hash).toBe('#/');
  });

  it('clears app innerHTML before rendering new view', async () => {
    route('/clear-test', handler);
    const app = document.getElementById('app');
    app.innerHTML = '<div>old content</div>';
    window.location.hash = '#/clear-test';
    forceResolve();
    // With existing content the router animates out first, so the handler runs
    // in a promise callback rather than synchronously.
    await Promise.resolve();
    expect(handler).toHaveBeenCalled();
    expect(app.innerHTML).not.toContain('old content');
  });
});
