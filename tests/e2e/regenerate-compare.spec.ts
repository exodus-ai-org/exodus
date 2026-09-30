/**
 * E2E: Regenerate as a side-by-side comparison (spec
 * docs/superpowers/specs/2026-09-26-regenerate-compare-design.md), on the
 * kernel's scripted provider. `faux-boot.ts` answers `COMPARE_QUESTION` with
 * the next take each time it is asked, so the answers can be told apart:
 * ask, regenerate, keep the first; the choice holds after a reload.
 */
import { TEST_IDS } from '../../packages/shared/src/constants/test-ids'
import {
  COMPARE_QUESTION,
  compareAnswer
} from '../../src/main/lib/ai/kernel/faux-memory-fixtures'
import { ApiClient } from '../fixtures/api-client'
import { electronTest as test, expect } from '../fixtures/electron'

const ANSWER_TIMEOUT = 30_000

test.describe('regenerate compares two answers', () => {
  test.beforeEach(async ({ mainWindow: _mw }) => {
    const api = new ApiClient()
    await api.updateSettings({
      providers: { openaiApiKey: 'faux' },
      providerConfig: { provider: 'OpenAI GPT', model: 'faux-1' },
      memory: { useInChat: false, autoCapture: false }
    })
  })

  test('side by side, one is kept, the other stays a click away', async ({
    electronApp,
    mainWindow
  }) => {
    // Wide enough for two columns, whatever the window opened at.
    await electronApp.evaluate(({ BrowserWindow }) => {
      const [win] = BrowserWindow.getAllWindows()
      win?.setSize(1440, 900)
    })

    const composer = mainWindow.getByTestId(TEST_IDS.composer.textarea)
    await composer.fill(COMPARE_QUESTION)
    await composer.press('Enter')
    const first = mainWindow.getByText(compareAnswer(1))
    const second = mainWindow.getByText(compareAnswer(2))
    await expect(first).toBeVisible({ timeout: ANSWER_TIMEOUT })

    await mainWindow.getByTestId(TEST_IDS.chat.regenerate).click()

    // Both answers under the question, asked once, each with its button.
    await expect(second).toBeVisible({ timeout: ANSWER_TIMEOUT })
    await expect(first).toBeVisible()
    const useThis = mainWindow.getByTestId(TEST_IDS.chat.compare.useThis)
    await expect(useThis).toHaveCount(2)
    await expect(
      mainWindow.locator('[data-user-msg-id]', { hasText: COMPARE_QUESTION })
    ).toHaveCount(1)

    // Keep the first: the second folds behind the link.
    await useThis.first().click()
    await expect(first).toBeVisible()
    await expect(second).toHaveCount(0)
    await expect(useThis).toHaveCount(0)

    // The "1 other version" link is hidden for now (owner, 2026-09-30);
    // the dialog behind it is covered by compare-turns.test.ts.
    await expect(
      mainWindow.getByTestId(TEST_IDS.chat.compare.otherVersionLink)
    ).toHaveCount(0)

    // The choice is the chat's, not the window's: it is there after a reload.
    await mainWindow.reload()
    await expect(first).toBeVisible({ timeout: ANSWER_TIMEOUT })
    await expect(second).toHaveCount(0)
  })

  test('in a narrow window the two answers are tabs', async ({
    electronApp,
    mainWindow
  }) => {
    await electronApp.evaluate(({ BrowserWindow }) => {
      const [win] = BrowserWindow.getAllWindows()
      win?.setSize(900, 800)
    })

    const composer = mainWindow.getByTestId(TEST_IDS.composer.textarea)
    await composer.fill(COMPARE_QUESTION)
    await composer.press('Enter')
    await expect(mainWindow.getByTestId(TEST_IDS.chat.regenerate)).toBeVisible({
      timeout: ANSWER_TIMEOUT
    })
    await mainWindow.getByTestId(TEST_IDS.chat.regenerate).click()

    // The newer answer is the tab on show; the earlier one is a tab away.
    const tabs = mainWindow.getByTestId(TEST_IDS.chat.compare.tab)
    await expect(tabs).toHaveCount(2, { timeout: ANSWER_TIMEOUT })
    await expect(mainWindow.getByText(/^Take \d+:/)).toHaveCount(1)
    const shown = await mainWindow.getByText(/^Take \d+:/).textContent()
    await tabs.first().click()
    await expect(mainWindow.getByText(/^Take \d+:/)).not.toHaveText(shown!)

    // A new message settles the comparison: the newer answer is kept.
    await composer.fill('thanks')
    await composer.press('Enter')
    await expect(tabs).toHaveCount(0)
    await expect(mainWindow.getByText(shown!)).toBeVisible()
  })
})
