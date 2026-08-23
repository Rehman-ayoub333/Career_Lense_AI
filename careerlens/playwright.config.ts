import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end configuration.
 *
 * The suite starts the dev server itself and reuses an already-running one
 * locally, so `npm run test:e2e` is a single command from a cold checkout.
 *
 * `/api/analyze` is intercepted in the specs rather than called for real. That
 * is deliberate and not a shortcut around a missing key: an end-to-end test that
 * calls a live model is non-deterministic by construction — the claims come back
 * different every run, so no assertion about what the document marks could be
 * stable. Intercepting at the network boundary keeps the whole browser-side
 * pipeline real (fetch, state, render, interaction) while fixing the one input
 * that must not vary. A live-key run is a separate manual check, and is reported
 * as not done rather than implied by these passing.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
