/**
 * API integration tests: Chat with OpenAI provider.
 * Requires OPENAI_API_KEY in .env.test and the app running on localhost:60223.
 */
import { ApiClient, apiTest as test, expect } from '../fixtures/api-client'
import { TestCleanup } from '../helpers/cleanup'
import { injectOpenAiProvider } from '../helpers/settings-inject'
import {
  getDoneMessages,
  getLastAssistantUpdate,
  getTitle,
  getError,
  extractAssistantText
} from '../helpers/wait-for-stream'

test.describe('Chat — OpenAI', () => {
  let cleanup: TestCleanup

  test.beforeAll(async () => {
    await injectOpenAiProvider(new ApiClient())
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
      text: 'What is 2 + 2? Reply with just the number.'
    })

    const error = getError(events)
    expect(error).toBeNull()

    const doneMessages = getDoneMessages(events)
    expect(doneMessages.length).toBeGreaterThanOrEqual(2)

    const assistant = getLastAssistantUpdate(events)
    const text = extractAssistantText(assistant)
    expect(text).toContain('4')
  })

  test('auto-generates title for new chat', async ({ api }) => {
    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    const events = await api.sendChatMessage({
      chatId,
      text: 'Tell me a fun fact about cats.'
    })

    const title = getTitle(events)
    expect(title).toBeTruthy()
    expect(typeof title).toBe('string')
    expect(title!.length).toBeGreaterThan(0)
  })

  test('messages are persisted to database', async ({ api }) => {
    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    await api.sendChatMessage({
      chatId,
      text: 'Say hello.'
    })

    const { data: messages } = await api.getChatMessages(chatId)
    expect(messages.length).toBeGreaterThanOrEqual(2)

    const userMsg = messages.find((m) => m.role === 'user')
    const assistantMsg = messages.find((m) => m.role === 'assistant')
    expect(userMsg).toBeTruthy()
    expect(assistantMsg).toBeTruthy()
  })

  test('chat appears in history', async ({ api }) => {
    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    await api.sendChatMessage({
      chatId,
      text: 'Hello for history test.'
    })

    const { data: history } = await api.getHistory()
    const found = history.find((c) => c.id === chatId)
    expect(found).toBeTruthy()
  })

  test('multi-turn conversation maintains context', async ({ api }) => {
    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    await api.sendChatMessage({
      chatId,
      text: 'My name is TestBot. Remember that.'
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
        content: 'What is my name?'
      }
    ]

    const events = await api.sendChatRaw({
      chatId,
      messages: allMessages
    })
    const assistant = getLastAssistantUpdate(events)
    const text = extractAssistantText(assistant)
    expect(text.toLowerCase()).toContain('testbot')
  })
})
