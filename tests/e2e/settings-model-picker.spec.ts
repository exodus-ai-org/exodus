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

test.describe('Settings model picker', () => {
  test('refresh button is disabled until an API key is entered', async ({
    mainWindow
  }) => {
    await openSettings(mainWindow)
    await mainWindow.getByRole('tab', { name: 'OpenAI' }).click()

    const refreshButton = mainWindow.getByTestId(
      TEST_IDS.providerModels.refreshButton
    )
    await refreshButton.waitFor({ state: 'visible', timeout: 10_000 })
    await expect(refreshButton).toBeDisabled()

    const modelSelect = mainWindow.getByTestId(
      TEST_IDS.providerModels.modelSelect
    )
    await expect(modelSelect).toBeVisible()

    await mainWindow.getByPlaceholder('sk-...').fill('sk-test-key-not-real')
    await expect(refreshButton).toBeEnabled()
  })
})
