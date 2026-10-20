import { defineConfig } from '@playwright/test'
const demoPort = process.env.PLAYWRIGHT_DEMO_PORT || '5173'
const apiPort = process.env.PLAYWRIGHT_API_PORT || '5174'

export default defineConfig({
  testDir: './tests',
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'demo',
      testMatch: 'sprint3.spec.ts',
      use: { baseURL: `http://127.0.0.1:${demoPort}` },
    },
    {
      name: 'api',
      testMatch: 'api.spec.ts',
      use: { baseURL: `http://127.0.0.1:${apiPort}` },
    },
  ],
  webServer: [
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${demoPort} --strictPort`,
      url: `http://127.0.0.1:${demoPort}`,
      env: { VITE_DATA_MODE: 'demo' },
      reuseExistingServer: false,
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${apiPort} --strictPort`,
      url: `http://127.0.0.1:${apiPort}`,
      env: { VITE_DATA_MODE: 'api' },
      reuseExistingServer: false,
    },
  ],
})
