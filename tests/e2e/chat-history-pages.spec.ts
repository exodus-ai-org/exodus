/**
 * E2E: a long chat opens on its newest page and loads the older ones as the
 * reader scrolls up (spec docs/superpowers/specs/2026-10-01-chat-history-and-context-design.md
 * §C3–C4, docs/chat-api.md §8), on the kernel's scripted provider.
 */
import { ApiClient } from '../fixtures/api-client'
import { electronTest as test, expect } from '../fixtures/electron'

const RUNS = 14

test.describe('chat history in pages', () => {
  test('opens on the newest runs and loads the rest on the way up', async ({
    mainWindow
  }) => {
    const api = new ApiClient()
    await api.updateSettings({
      providers: { openaiApiKey: 'faux' },
      providerConfig: { provider: 'OpenAI GPT', model: 'faux-1' },
      memory: { useInChat: false, autoCapture: false }
    })
    const chatId = crypto.randomUUID()
    for (let i = 1; i <= RUNS; i++) {
      await api.sendChatMessage({ chatId, text: `Question number ${i}` })
    }

    await mainWindow.evaluate((id) => {
      window.location.hash = `#/chat/${id}`
    }, chatId)

    const question = (i: number) =>
      mainWindow.locator('[data-user-msg-id]', {
        hasText: new RegExp(`^Question number ${i}$`)
      })
    // The newest page: the last question, not the first.
    await expect(question(RUNS)).toBeVisible({ timeout: 15_000 })
    await expect(question(1)).toHaveCount(0)

    // Scrolling up brings the older pages in, one after another.
    await question(RUNS).hover()
    await expect(async () => {
      await mainWindow.mouse.wheel(0, -4000)
      await expect(question(1)).toHaveCount(1, { timeout: 1_000 })
    }).toPass({ timeout: 20_000 })

    // Every run once: nothing lost, nothing twice.
    await expect(mainWindow.locator('[data-user-msg-id]')).toHaveCount(RUNS)
  })
})
