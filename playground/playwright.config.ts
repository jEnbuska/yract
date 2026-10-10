import { defineConfig, devices } from "@playwright/test";

const BROWSERS = [
  { name: "chromium", device: "Desktop Chrome" },
  { name: "firefox", device: "Desktop Firefox" },
  { name: "webkit", device: "Desktop Safari" },
] as const;

/** Specs that drive the 6000-row deferred table. */
const HEAVY_SPECS = /deferred.*\.spec\.ts$/;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],

  use: {
    baseURL: "http://localhost:5173",
    headless: true,
    screenshot: "only-on-failure",
  },

  /**
   * Start the Vite dev server before running tests.
   * The server is shut down automatically after all tests complete.
   */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },

  projects: [
    // Quick specs: every browser, fully parallel.
    ...BROWSERS.map(({ name, device }) => ({
      name,
      use: { ...devices[device] },
      testIgnore: HEAVY_SPECS,
    })),
    // The deferred-table specs render a 6000-row table next to an animated lag
    // spinner, so they are slow and sensitive to CPU load. `npm test` runs them
    // in a second, single-worker pass after the quick specs (see package.json).
    ...BROWSERS.map(({ name, device }) => ({
      name: `${name}-deferred`,
      use: { ...devices[device] },
      testMatch: HEAVY_SPECS,
      workers: 1,
      fullyParallel: false,
      timeout: 120_000,
    })),
  ],
});
