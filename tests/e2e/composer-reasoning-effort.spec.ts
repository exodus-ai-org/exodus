import { TEST_IDS } from '../../src/shared/constants/test-ids'
import { ApiClient } from '../fixtures/api-client'
import { electronTest as test, expect } from '../fixtures/electron'

test.describe('Composer reasoning effort picker', () => {
  test('reasoning menu shows only the levels the active model supports', async ({
    mainWindow
  }) => {
    const api = new ApiClient()
    await api.updateSettings({
      providerConfig: {
        provider: 'OpenAI GPT',
        model: 'gpt-5.6',
        modelSnapshot: {
          contextWindow: 1_050_000,
          maxOutputTokens: 128_000,
          reasoningLevels: ['off', 'low', 'medium'],
          cost: { input: 4, output: 20 }
        }
      }
    })
    await mainWindow.reload()
    await mainWindow.waitForLoadState('domcontentloaded')

    await mainWindow.getByLabel('Add').click()
    await mainWindow.getByTestId(TEST_IDS.composer.reasoningEffortItem).click()

    await expect(
      mainWindow.getByTestId(`${TEST_IDS.composer.reasoningEffortLevel}-low`)
    ).toBeVisible()
    await expect(
      mainWindow.getByTestId(`${TEST_IDS.composer.reasoningEffortLevel}-high`)
    ).toHaveCount(0)
  })

  test('reasoning menu item is absent when the model has no reasoning levels', async ({
    mainWindow
  }) => {
    const api = new ApiClient()
    await api.updateSettings({
      providerConfig: {
        provider: 'OpenAI GPT',
        model: 'gpt-5.6-luna',
        modelSnapshot: {
          contextWindow: 1_050_000,
          maxOutputTokens: 128_000,
          reasoningLevels: [],
          cost: { input: 0.2, output: 1.2 }
        }
      }
    })
    await mainWindow.reload()
    await mainWindow.waitForLoadState('domcontentloaded')

    await mainWindow.getByLabel('Add').click()
    await expect(
      mainWindow.getByTestId(TEST_IDS.composer.reasoningEffortItem)
    ).toHaveCount(0)
  })
})
