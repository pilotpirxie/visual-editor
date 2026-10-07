import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_SPECS = /mobile\.spec\.ts$/;
const PERF_SPECS = /perf\//;
const DESKTOP_IGNORED = [MOBILE_SPECS, PERF_SPECS];

const EDGE_PROJECTS =
  process.env.E2E_EDGE === '1'
    ? [
        {
          name: 'msedge',
          testIgnore: DESKTOP_IGNORED,
          use: { ...devices['Desktop Edge'], channel: 'msedge', viewport: DESKTOP_VIEWPORT },
        },
      ]
    : [];

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
      testIgnore: DESKTOP_IGNORED,
      use: { ...devices['Desktop Chrome'], viewport: DESKTOP_VIEWPORT },
    },
    {
      name: 'firefox',
      testIgnore: DESKTOP_IGNORED,
      use: { ...devices['Desktop Firefox'], viewport: DESKTOP_VIEWPORT },
    },
    {
      name: 'webkit',
      testIgnore: DESKTOP_IGNORED,
      use: { ...devices['Desktop Safari'], viewport: DESKTOP_VIEWPORT },
    },
    { name: 'mobile-webkit', testMatch: MOBILE_SPECS, use: { ...devices['iPhone 13'] } },
    { name: 'mobile-chromium', testMatch: MOBILE_SPECS, use: { ...devices['Pixel 7'] } },
    ...EDGE_PROJECTS,
  ],
  webServer: {
    command: `yarn vite --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
});
