/**
 * API integration tests: Chat history CRUD and search.
 */
import { ApiClient, apiTest as test, expect } from '../fixtures/api-client'
import { TestCleanup } from '../helpers/cleanup'
import { injectOpenAiProvider } from '../helpers/settings-inject'

test.describe('Chat History & Search', () => {
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

  test('GET /api/history returns chat list', async ({ api }) => {
    const { status, data } = await api.getHistory()
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
  })

  test('DELETE /api/chat/:id removes a chat', async ({ api }) => {
    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    await api.sendChatMessage({ chatId, text: 'Delete me.' })

    const { data: before } = await api.getHistory()
    expect(before.find((c) => c.id === chatId)).toBeTruthy()

    const { status } = await api.deleteChat(chatId)
    expect(status).toBe(200)

    const { data: after } = await api.getHistory()
    expect(after.find((c) => c.id === chatId)).toBeFalsy()
  })

  test('PUT /api/chat updates chat metadata', async ({ api }) => {
    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    await api.sendChatMessage({ chatId, text: 'Update me.' })

    await api.put('/api/chat', {
      id: chatId,
      title: 'Renamed Chat',
      favorite: true
    })

    const { data: history } = await api.getHistory()
    const chat = history.find((c) => c.id === chatId)
    expect(chat).toBeTruthy()
    expect(chat!.title).toBe('Renamed Chat')
    expect(chat!.favorite).toBe(true)
  })

  test('GET /api/chat/:id returns messages for a chat', async ({ api }) => {
    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    await api.sendChatMessage({ chatId, text: 'Message persistence test.' })

    const { status, data } = await api.getChatMessages(chatId)
    expect(status).toBe(200)
    expect(data.length).toBeGreaterThanOrEqual(2)
  })

  test('GET /api/chat/search finds messages by keyword', async ({ api }) => {
    const chatId = crypto.randomUUID()
    cleanup.trackChat(chatId)

    const uniqueKeyword = `xyzzy${Date.now()}`
    await api.sendChatMessage({
      chatId,
      text: `Remember this unique keyword: ${uniqueKeyword}`
    })

    const { status, data } = await api.searchMessages(uniqueKeyword)
    expect(status).toBe(200)
    expect(data.length).toBeGreaterThanOrEqual(1)
  })
})
