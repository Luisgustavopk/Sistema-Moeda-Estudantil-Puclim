import { defineConfig } from '@playwright/test'
const port = process.env.PLAYWRIGHT_LIVE_PORT || '5175'

export default defineConfig({
  testDir: './tests',
  testMatch: [
    'live.spec.ts',
    'gamification.live.spec.ts',
    'peer-transfers.live.spec.ts',
  ],
  timeout: 90000,
  expect: { timeout: 15000 },
  workers: 1,
  use: {
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    env: {
      VITE_DATA_MODE: 'api',
      VITE_PROXY_TARGET: process.env.LIVE_API_TARGET || 'http://localhost:8080',
    },
    reuseExistingServer: false,
  },
})
