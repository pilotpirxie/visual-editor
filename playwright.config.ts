import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_SPECS = /mobile\.spec\.ts$/;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: 1,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: MOBILE_SPECS,
      use: { ...devices['Desktop Chrome'], viewport: DESKTOP_VIEWPORT },
    },
    {
      name: 'firefox',
      testIgnore: MOBILE_SPECS,
      use: { ...devices['Desktop Firefox'], viewport: DESKTOP_VIEWPORT },
    },
    {
      name: 'webkit',
      testIgnore: MOBILE_SPECS,
      use: { ...devices['Desktop Safari'], viewport: DESKTOP_VIEWPORT },
    },
    { name: 'mobile-webkit', testMatch: MOBILE_SPECS, use: { ...devices['iPhone 13'] } },
    { name: 'mobile-chromium', testMatch: MOBILE_SPECS, use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `yarn vite --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
});
