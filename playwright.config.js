import { defineConfig } from '@playwright/test';

// Point the suite at a deployed site with BASE_URL, e.g.
//   BASE_URL=https://web.archiveszone.app npx playwright test
// Verifying the built, deployed app is not the same as verifying the working
// copy - the CDN CORS bug that made every Al-Andalus and daily-story video
// unplayable only existed in production.
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const IS_LOCAL = BASE_URL.includes('localhost');

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile',
      use: { browserName: 'chromium', viewport: { width: 390, height: 844 } },
    },
  ],
  // Only serve locally when testing locally.
  webServer: IS_LOCAL
    ? {
        command: 'python -m http.server 8080',
        port: 8080,
        reuseExistingServer: true,
      }
    : undefined,
});
