import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  use: { baseURL: process.env.REB_TEST_BASE_URL || 'http://127.0.0.1:3000', browserName: 'chromium', channel: 'chrome', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
})
