/**
 * Provider smoke tests: OpenAI
 */
import { ApiClient, apiTest as test, expect } from '../fixtures/api-client'
import { TestCleanup } from '../helpers/cleanup'
import { injectOpenAiProvider } from '../helpers/settings-inject'
import {
  getError,
  getLastAssistantUpdate,
  extractAssistantText
} from '../helpers/wait-for-stream'

test.describe('Provider: OpenAI', () => {
  let cleanup: TestCleanup

  // Set provider before EACH test to avoid cross-test provider conflicts
  test.beforeEach(async ({ api }) => {
    await injectOpenAiProvider(new ApiClient())
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
      text: 'What is 2 + 2? Reply with just the number.'
    })
    expect(getError(events)).toBeNull()
    expect(extractAssistantText(getLastAssistantUpdate(events))).toContain('4')
  })

  test('multi-turn context retention', async ({ api }) => {
    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    await api.sendChatMessage({ chatId, text: 'My favorite color is blue.' })
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
        content: 'What is my favorite color?'
      }
    ]

    const events = await api.sendChatRaw({ chatId, messages: allMessages })

    expect(getError(events)).toBeNull()
    expect(
      extractAssistantText(getLastAssistantUpdate(events)).toLowerCase()
    ).toContain('blue')
  })

  test('tool calling (calculator)', async ({ api }) => {
    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    const events = await api.sendChatMessage({
      chatId,
      text: 'Compute 99 * 99 and tell me the result.'
    })
    expect(getError(events)).toBeNull()
    const text = extractAssistantText(getLastAssistantUpdate(events))
    // LLM may format with commas
    expect(text.replace(/,/g, '')).toContain('9801')
  })

  test('reasoning mode (o4-mini)', async ({ api }) => {
    test.setTimeout(120_000)

    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    const events = await api.sendChatMessage({
      chatId,
      text: 'What is 100 factorial divided by 99 factorial? Think carefully.',
      advancedTools: ['Reasoning']
    })
    expect(getError(events)).toBeNull()

    // Reasoning models may not emit message_update events.
    // Verify the stream completed (done event exists) and messages were persisted.
    const done = events.find((e) => e.type === 'done')
    expect(done).toBeTruthy()

    const { data: msgs } = await api.getChatMessages(chatId)
    const assistant = msgs.find((m) => m.role === 'assistant')
    expect(assistant).toBeTruthy()
  })
})
