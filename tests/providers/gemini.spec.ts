/**
 * Provider smoke tests: Google Gemini
 */
import { ApiClient, apiTest as test, expect } from '../fixtures/api-client'
import { TestCleanup } from '../helpers/cleanup'
import { injectGeminiProvider } from '../helpers/settings-inject'
import {
  getError,
  getLastAssistantUpdate,
  extractAssistantText
} from '../helpers/wait-for-stream'

// Gemini tests require a valid Google Gemini API key
// The GOOGLE_CLOUD key may be for other Google services
test.describe('Provider: Google Gemini', () => {
  let cleanup: TestCleanup

  test.beforeEach(async ({ api }) => {
    await injectGeminiProvider(new ApiClient())
    cleanup = new TestCleanup(api)
  })

  test.afterEach(async () => {
    await cleanup.run()
  })

  test.skip('simple Q&A — needs valid Gemini API key', async ({ api }) => {
    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    const events = await api.sendChatMessage({
      chatId,
      text: 'What is 7 * 8? Reply with just the number.'
    })
    expect(getError(events)).toBeNull()
    expect(extractAssistantText(getLastAssistantUpdate(events))).toContain('56')
  })

  test.skip('multi-turn context retention — needs valid Gemini API key', async ({
    api
  }) => {
    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    await api.sendChatMessage({
      chatId,
      text: 'The capital of France is Paris.'
    })
    const { data: msgs } = await api.getChatMessages(chatId)

    const allMessages = [
      ...msgs.map((m) => ({
        id: m.id as string,
        role: m.role as string,
        content: m.content
      })),
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: 'What city did I just mention?'
      }
    ]

    const events = await api.sendChatRaw({ chatId, messages: allMessages })

    expect(getError(events)).toBeNull()
    expect(
      extractAssistantText(getLastAssistantUpdate(events)).toLowerCase()
    ).toContain('paris')
  })
})
