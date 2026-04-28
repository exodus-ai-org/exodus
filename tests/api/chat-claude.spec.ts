/**
 * API integration tests: Chat with Claude/Anthropic provider.
 */
import { ApiClient, apiTest as test, expect } from '../fixtures/api-client'
import { TestCleanup } from '../helpers/cleanup'
import { injectClaudeProvider } from '../helpers/settings-inject'
import {
  getDoneMessages,
  getLastAssistantUpdate,
  getError,
  extractAssistantText
} from '../helpers/wait-for-stream'

test.describe('Chat — Claude', () => {
  let cleanup: TestCleanup

  test.beforeAll(async () => {
    await injectClaudeProvider(new ApiClient())
  })

  test.beforeEach(async ({ api }) => {
    cleanup = new TestCleanup(api)
  })

  test.afterEach(async () => {
    await cleanup.run()
  })

  test('simple question returns streamed response', async ({ api }) => {
    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    const events = await api.sendChatMessage({
      chatId,
      text: 'What is 3 * 7? Reply with just the number.'
    })

    const error = getError(events)
    expect(error).toBeNull()

    const doneMessages = getDoneMessages(events)
    expect(doneMessages.length).toBeGreaterThanOrEqual(2)

    const assistant = getLastAssistantUpdate(events)
    const text = extractAssistantText(assistant)
    expect(text).toContain('21')
  })

  test('messages are persisted to database', async ({ api }) => {
    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    await api.sendChatMessage({
      chatId,
      text: 'Say "pong".'
    })

    const { data: messages } = await api.getChatMessages(chatId)
    expect(messages.length).toBeGreaterThanOrEqual(2)

    const assistantMsg = messages.find((m) => m.role === 'assistant')
    expect(assistantMsg).toBeTruthy()
  })

  test('reasoning mode with Claude', async ({ api }) => {
    test.setTimeout(120_000)

    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    const events = await api.sendChatMessage({
      chatId,
      text: 'Think step by step: what is 15 factorial divided by 14 factorial?',
      advancedTools: ['Reasoning']
    })

    const error = getError(events)
    expect(error).toBeNull()

    const assistant = getLastAssistantUpdate(events)
    const text = extractAssistantText(assistant)
    expect(text).toContain('15')
  })
})
