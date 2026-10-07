import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;
const BASE_URL = `http://localhost:${PORT}`;
const BUILD_TIMEOUT_MS = 300_000;

export default defineConfig({
  testDir: 'e2e/perf',
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { baseURL: BASE_URL, reducedMotion: 'reduce', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'chromium-perf',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `yarn build && yarn vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: BUILD_TIMEOUT_MS,
  },
});
