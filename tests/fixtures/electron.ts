import { rmSync } from 'fs'
import { tmpdir } from 'os'
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

const E2E_HOME = process.env.HOME ?? ''

// The fixture wipes ~/.exodus under this HOME before every test. That is only
// ever acceptable for the scratch dir playwright.config.ts points HOME at —
// against a real home it would delete real data (dev builds use ~/.exodus).
// So refuse to run against anything else.
if (
  path.basename(E2E_HOME) !== 'exodus-e2e-home' ||
  !E2E_HOME.startsWith(tmpdir())
) {
  throw new Error(
    `e2e fixture refuses to run: HOME is not the scratch dir (HOME=${E2E_HOME}). Run the suite through playwright.config.ts.`
  )
}

export const electronTest = base.extend<ElectronFixtures>({
  // eslint-disable-next-line no-empty-pattern
  electronApp: async ({}, use) => {
    // The repo root: Electron resolves `main` (.vite/build/main.js) from
    // package.json, and loads the built renderer from .vite/renderer. Run
    // `bun run package` first — it produces those production bundles (a
    // `bun run start` session leaves dev-server builds in .vite instead).
    // Unpackaged, so the app keeps its data in ~/.exodus — which is the
    // scratch dir's, because playwright.config.ts points $HOME there.
    const appPath = path.resolve(__dirname, '../..')

    // Every test starts from a fresh database and profile. Settings persist
    // (language, theme, API keys…), so without this a test that changes one
    // leaks it into whichever test runs next.
    rmSync(path.join(E2E_HOME, '.exodus'), { recursive: true, force: true })
    rmSync(path.join(E2E_HOME, 'user-data'), { recursive: true, force: true })

    const app = await electron.launch({
      args: [appPath, `--user-data-dir=${path.join(E2E_HOME, 'user-data')}`],
      env: {
        ...process.env,
        // A leftover EXODUS_HOME in the developer's shell would point the app
        // (and its writes) at real data instead of the scratch HOME.
        EXODUS_HOME: '',
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

    // The composer autofocuses on mount, and use-keyboard-shortcuts ignores
    // every shortcut except Escape while a TEXTAREA/INPUT has focus — so a
    // spec that opens Settings with Cmd+, straight after launch would press
    // it into a no-op. Let go of the initial focus once the first render has
    // replaced the boot splash; specs that type still click/fill first.
    await window
      .waitForFunction(() => !document.getElementById('boot-splash'), null, {
        timeout: 15_000
      })
      .catch(() => undefined)
    await window.evaluate(() =>
      (document.activeElement as HTMLElement | null)?.blur()
    )

    await use(window)
  }
})

export { expect } from '@playwright/test'
