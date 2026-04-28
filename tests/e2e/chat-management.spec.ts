import { ApiClient } from '../fixtures/api-client'
/**
 * E2E: Chat management operations (rename, favorite, delete).
 * Uses API to set up test data, then verifies UI reflects changes.
 */
import { electronTest as test, expect } from '../fixtures/electron'
import { injectOpenAiProvider } from '../helpers/settings-inject'

test.describe('Chat Management E2E', () => {
  const api = new ApiClient()
  const testChatIds: string[] = []

  // See chat-e2e.spec.ts: beforeAll runs before fixtures, so the Hono server
  // doesn't exist yet and the inject fetch errors out. beforeEach with
  // `mainWindow` forces the Electron app up first, then idempotently
  // re-injects the provider config.
  test.beforeEach(async ({ mainWindow: _mw }) => {
    await injectOpenAiProvider(api)
  })

  test.afterEach(async () => {
    for (const id of testChatIds.splice(0)) {
      await api.deleteChat(id).catch(() => {})
    }
  })

  test('rename a chat via API and verify in history', async ({
    mainWindow
  }) => {
    // Create a chat via API
    const chatId = crypto.randomUUID()
    testChatIds.push(chatId)

    await api.sendChatMessage({ chatId, text: 'Rename test chat.' })
    await api.put('/api/chat', {
      id: chatId,
      title: 'My Renamed Chat E2E'
    })

    // Reload the app and check sidebar
    await mainWindow.reload()
    await mainWindow.waitForTimeout(2_000)

    // The renamed title should appear somewhere in the sidebar
    const pageContent = await mainWindow.textContent('body')
    expect(pageContent).toContain('My Renamed Chat E2E')
  })

  test('delete a chat removes it from sidebar', async ({ mainWindow }) => {
    const chatId = crypto.randomUUID()
    testChatIds.push(chatId)

    await api.sendChatMessage({ chatId, text: 'Delete test.' })
    await api.put('/api/chat', {
      id: chatId,
      title: 'ToBeDeleted_E2E'
    })

    await mainWindow.reload()
    await mainWindow.waitForTimeout(2_000)

    let pageContent = await mainWindow.textContent('body')
    expect(pageContent).toContain('ToBeDeleted_E2E')

    // Delete via API
    await api.deleteChat(chatId)

    // Reload and verify removed
    await mainWindow.reload()
    await mainWindow.waitForTimeout(2_000)
    pageContent = await mainWindow.textContent('body')
    expect(pageContent).not.toContain('ToBeDeleted_E2E')
  })
})
