import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for the Wizard Punkteblock.
 *
 * - Tests run against the production build served by `vite preview` (port 4173),
 *   so we exercise the real artifact (incl. `base: './'`).
 * - Two projects, each test runs exactly once:
 *     * chromium-desktop -> all specs NOT tagged @mobile
 *     * chromium-mobile  -> only specs tagged @mobile (Pixel 7 emulation)
 *   This keeps total runtime low (no desktop+mobile duplication of every test).
 * - The webServer builds and serves the app; locally an already running preview
 *   is reused, in CI a fresh build is always produced.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
      grepInvert: /@mobile/,
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7'] },
      grep: /@mobile/,
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
