import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.QA_BASE_URL || 'https://game.kingofzeusfin.com'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: 120_000,
  expect: { timeout: 45_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
