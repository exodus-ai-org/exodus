/**
 * Provider smoke tests: Claude (Anthropic)
 */
import { ApiClient, apiTest as test, expect } from '../fixtures/api-client'
import { TestCleanup } from '../helpers/cleanup'
import { injectClaudeProvider } from '../helpers/settings-inject'
import {
  getError,
  getLastAssistantUpdate,
  extractAssistantText
} from '../helpers/wait-for-stream'

test.describe('Provider: Claude', () => {
  let cleanup: TestCleanup

  test.beforeEach(async ({ api }) => {
    await injectClaudeProvider(new ApiClient())
    cleanup = new TestCleanup(api)
  })

  test.afterEach(async () => {
    await cleanup.run()
  })

  test('simple Q&A', async ({ api }) => {
    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    const events = await api.sendChatMessage({
      chatId,
      text: 'What is 3 + 5? Reply with just the number.'
    })
    expect(getError(events)).toBeNull()
    expect(extractAssistantText(getLastAssistantUpdate(events))).toContain('8')
  })

  test('multi-turn context retention', async ({ api }) => {
    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    await api.sendChatMessage({
      chatId,
      text: 'My pet is a golden retriever named Max.'
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
        content: "What is my pet's name?"
      }
    ]

    const events = await api.sendChatRaw({ chatId, messages: allMessages })

    expect(getError(events)).toBeNull()
    expect(
      extractAssistantText(getLastAssistantUpdate(events)).toLowerCase()
    ).toContain('max')
  })

  test('tool calling (calculator)', async ({ api }) => {
    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    const events = await api.sendChatMessage({
      chatId,
      text: 'Compute 12 * 13 and tell me the result.'
    })
    expect(getError(events)).toBeNull()
    expect(
      extractAssistantText(getLastAssistantUpdate(events)).replace(/,/g, '')
    ).toContain('156')
  })

  test('reasoning mode (extended thinking)', async ({ api }) => {
    test.setTimeout(120_000)

    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    const events = await api.sendChatMessage({
      chatId,
      text: 'What is 50 factorial divided by 49 factorial? Think step by step.',
      advancedTools: ['Reasoning']
    })
    expect(getError(events)).toBeNull()
    expect(extractAssistantText(getLastAssistantUpdate(events))).toContain('50')
  })
})
