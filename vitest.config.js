import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    // Pinned west of UTC on purpose. On a UTC/London machine a UTC date and a
    // local date are the same string for most of the day, so timezone bugs in
    // the daily-story and streak logic pass unnoticed. Los Angeles makes them
    // diverge every evening.
    env: { TZ: 'America/Los_Angeles' },
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
});
