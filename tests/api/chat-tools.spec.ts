/**
 * API integration tests: Chat with tool calling.
 */
import { ApiClient, apiTest as test, expect } from '../fixtures/api-client'
import { TestCleanup } from '../helpers/cleanup'
import { injectOpenAiProvider } from '../helpers/settings-inject'
import {
  getError,
  getLastAssistantUpdate,
  extractAssistantText,
  getToolResults
} from '../helpers/wait-for-stream'

test.describe('Chat — Tool Calling', () => {
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

  test('calculator tool is invoked for math expressions', async ({ api }) => {
    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    const events = await api.sendChatMessage({
      chatId,
      text: 'Use the calculator tool to compute: 123 * 456 + 789'
    })

    const error = getError(events)
    expect(error).toBeNull()

    const toolResults = getToolResults(events)
    expect(toolResults.length).toBeGreaterThanOrEqual(1)

    const assistant = getLastAssistantUpdate(events)
    const text = extractAssistantText(assistant)
    // LLM may format with commas: "56,877" or plain "56877"
    expect(text.replace(/,/g, '')).toContain('56877')
  })

  test('web search tool is invoked', async ({ api }) => {
    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    const events = await api.sendChatMessage({
      chatId,
      text: 'Search the web for the current population of Tokyo and tell me.',
      advancedTools: ['Web Search']
    })

    const error = getError(events)
    expect(error).toBeNull()

    const toolResults = getToolResults(events)
    expect(toolResults.length).toBeGreaterThanOrEqual(1)

    const assistant = getLastAssistantUpdate(events)
    const text = extractAssistantText(assistant)
    expect(text.length).toBeGreaterThan(20)
  })

  test('date tool returns current date info', async ({ api }) => {
    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    const events = await api.sendChatMessage({
      chatId,
      text: "What is today's date? Use the date tool."
    })

    const error = getError(events)
    expect(error).toBeNull()

    const assistant = getLastAssistantUpdate(events)
    const text = extractAssistantText(assistant)
    expect(text).toContain('2026')
  })
})
