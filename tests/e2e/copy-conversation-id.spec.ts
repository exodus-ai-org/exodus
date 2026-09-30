/**
 * E2E: a chat's menu in the sidebar copies the conversation's id — what the
 * user pastes into another chat so the model can read this one
 * (`lcm_describe` / `lcm_grep` with the id). On the kernel's scripted
 * provider: a send creates the chat.
 */
import { TEST_IDS } from '../../packages/shared/src/constants/test-ids'
import { ApiClient } from '../fixtures/api-client'
import { electronTest as test, expect } from '../fixtures/electron'

test.describe('copy conversation id', () => {
  test.beforeEach(async ({ mainWindow: _mw }) => {
    const api = new ApiClient()
    await api.updateSettings({
      providers: { openaiApiKey: 'faux' },
      providerConfig: { provider: 'OpenAI GPT', model: 'faux-1' },
      memory: { useInChat: false, autoCapture: false }
    })
  })

  test('the sidebar menu puts the id of its chat on the clipboard', async ({
    electronApp,
    mainWindow
  }) => {
    const composer = mainWindow.getByTestId(TEST_IDS.composer.textarea)
    await composer.fill('weather in Oslo')
    await composer.press('Enter')
    await expect(
      mainWindow.getByTestId(TEST_IDS.chat.messageAction)
    ).toHaveCount(1, { timeout: 30_000 })

    // The chat is the page's own: its id is in the route.
    await expect
      .poll(() => mainWindow.evaluate(() => window.location.hash), {
        timeout: 10_000
      })
      .toContain('/chat/')
    const chatId = await mainWindow.evaluate(
      () => window.location.hash.split('/chat/')[1]?.split(/[?#/]/u)[0] ?? ''
    )
    expect(chatId).toMatch(/^[0-9a-f-]{36}$/u)

    // Main's clipboard, not the page's: reading it from the page would need
    // a permission the app does not grant.
    await electronApp.evaluate(({ clipboard }) => clipboard.writeText(''))

    const row = mainWindow
      .locator('[data-slot="sidebar-menu-item"]')
      .filter({ has: mainWindow.locator(`a[href*="${chatId}"]`) })
    await row.hover()
    await row.getByTestId(TEST_IDS.chatLayout.historyItemMenu).click()
    await mainWindow.getByTestId(TEST_IDS.chatLayout.copyChatId).click()

    await expect
      .poll(() => electronApp.evaluate(({ clipboard }) => clipboard.readText()))
      .toBe(chatId)
  })
})
