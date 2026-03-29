import path from 'path'

/**
 * Playwright fixture that launches the Electron app and exposes
 * `electronApp` + `mainWindow` to every test that needs them.
 *
 * Reference: https://www.electronjs.org/docs/latest/tutorial/automated-testing
 */
import {
  test as base,
  type ElectronApplication,
  type Page
} from '@playwright/test'
import { _electron as electron } from 'playwright'

export type ElectronFixtures = {
  electronApp: ElectronApplication
  mainWindow: Page
}

export const electronTest = base.extend<ElectronFixtures>({
  // eslint-disable-next-line no-empty-pattern
  electronApp: async ({}, use) => {
    const appPath = path.resolve(__dirname, '../../out/main/index.js')

    const app = await electron.launch({
      args: [appPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        // Prevent auto-update popups during testing
        EXODUS_DISABLE_AUTO_UPDATE: '1'
      }
    })

    await use(app)
    await app.close()
  },

  mainWindow: async ({ electronApp }, use) => {
    // Wait for the first BrowserWindow to open
    const window = await electronApp.firstWindow()

    // Wait for the renderer to be fully loaded
    await window.waitForLoadState('domcontentloaded')

    await use(window)
  }
})

export { expect } from '@playwright/test'
