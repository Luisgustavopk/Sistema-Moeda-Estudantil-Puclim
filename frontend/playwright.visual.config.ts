import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: 'visual-review.spec.ts',
  timeout: 180000,
  expect: { timeout: 10000 },
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.VISUAL_URL || 'http://127.0.0.1:5474',
    channel: 'chrome',
    headless: true,
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
})
