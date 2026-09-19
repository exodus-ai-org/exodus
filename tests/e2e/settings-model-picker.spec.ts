import { TEST_IDS } from '../../packages/shared/src/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'
import { openSettings } from '../helpers/open-settings'

test.describe('Settings model picker', () => {
  test('refresh button is disabled until an API key is entered', async ({
    mainWindow
  }) => {
    await openSettings(mainWindow, 'AI Providers')
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
