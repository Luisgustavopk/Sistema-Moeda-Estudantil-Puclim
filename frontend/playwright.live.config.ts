import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: 'live.spec.ts',
  timeout: 90000,
  expect: { timeout: 15000 },
  workers: 1,
  use: {
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    baseURL: 'http://127.0.0.1:5175',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5175',
    url: 'http://127.0.0.1:5175',
    env: {
      VITE_DATA_MODE: 'api',
      VITE_PROXY_TARGET: process.env.LIVE_API_TARGET || 'http://localhost:8080',
    },
    reuseExistingServer: false,
  },
})
