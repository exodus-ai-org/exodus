import path from 'path'

import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '.env.test') })

// Bypass system proxy for localhost API calls
process.env.no_proxy = (process.env.no_proxy || '') + ',localhost,127.0.0.1'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 60_000,

  use: {
    trace: 'on-first-retry'
  },

  projects: [
    // ── Layer 1: API integration tests (no Electron needed) ──
    {
      name: 'api',
      testDir: './tests/api',
      timeout: 120_000
    },

    // ── Layer 2: Electron E2E tests ──
    {
      name: 'e2e',
      testDir: './tests/e2e',
      timeout: 60_000
    },

    // ── Layer 3: Provider compatibility ──
    {
      name: 'providers',
      testDir: './tests/providers',
      timeout: 120_000
    }
  ]
})
