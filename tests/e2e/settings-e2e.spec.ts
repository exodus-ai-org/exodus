/**
 * E2E: Settings page interaction.
 */
import { TEST_IDS } from '../../src/shared/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'

async function openSettings(mainWindow: import('@playwright/test').Page) {
  const settingsLink = mainWindow.locator(
    '[data-testid="nav-settings"], a[href*="settings"], button:has-text("Settings")'
  )
  if (
    await settingsLink
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false)
  ) {
    await settingsLink.first().click()
    await mainWindow.waitForTimeout(1_000)
  }
}

test.describe('Settings E2E', () => {
  test('settings page renders and shows provider options', async ({
    mainWindow
  }) => {
    await openSettings(mainWindow)

    // Settings page should contain provider-related text
    const bodyText = await mainWindow.textContent('body')
    const hasProviderContent =
      bodyText?.includes('OpenAI') ||
      bodyText?.includes('Claude') ||
      bodyText?.includes('Provider') ||
      bodyText?.includes('API Key')

    expect(hasProviderContent).toBe(true)
  })

  test('theme mode switcher changes the active mode', async ({
    mainWindow
  }) => {
    await openSettings(mainWindow)

    const dark = mainWindow.getByTestId(`${TEST_IDS.settings.themeMode}-dark`)
    const light = mainWindow.getByTestId(`${TEST_IDS.settings.themeMode}-light`)
    await dark.waitFor({ state: 'visible', timeout: 10_000 })

    await dark.click()
    await expect
      .poll(() => mainWindow.evaluate(() => document.documentElement.className))
      .toContain('dark')

    await light.click()
    await expect
      .poll(() => mainWindow.evaluate(() => document.documentElement.className))
      .not.toContain('dark')
  })
})
