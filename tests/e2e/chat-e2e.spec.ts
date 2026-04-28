import { ApiClient } from '../fixtures/api-client'
/**
 * E2E: Full chat flow in the Electron window.
 * Prerequisites: API keys already configured (run API tests first or inject via API).
 */
import { electronTest as test, expect } from '../fixtures/electron'
import { injectOpenAiProvider } from '../helpers/settings-inject'

test.describe('Chat E2E', () => {
  // These tests send real messages to an LLM. Skip cleanly in CI environments
  // where the OPENAI_API_KEY secret isn't configured — without a key the
  // chat handler throws before saveChat, so downstream assertions about
  // sidebar entries / streamed responses can't pass.
  test.skip(
    !process.env.OPENAI_API_KEY,
    'requires OPENAI_API_KEY env var to drive a real chat through the LLM'
  )

  // beforeEach (not beforeAll) so it runs AFTER the per-test electronApp /
  // mainWindow fixtures — beforeAll runs before any test fixture is set up,
  // so the Hono server on localhost:60223 doesn't exist yet and the inject
  // fetch fails with "fetch failed". Pulling in `mainWindow` here forces the
  // Electron app to be up before we hit its API.
  test.beforeEach(async ({ mainWindow: _mw }) => {
    const api = new ApiClient()
    await injectOpenAiProvider(api)
  })

  test('send a message and receive a streamed response', async ({
    mainWindow
  }) => {
    // The window is already loaded with the production renderer (file://) —
    // navigating to a hardcoded localhost:5173 dev URL just hits
    // ERR_CONNECTION_REFUSED in CI. Stay on the page Electron loaded.
    // Wait for the chat input to appear
    const chatInput = mainWindow.locator(
      'textarea, [contenteditable="true"], [data-testid="chat-input"]'
    )
    await chatInput.first().waitFor({ state: 'visible', timeout: 10_000 })

    // Type a message
    await chatInput.first().fill('What is 1 + 1? Reply with just the number.')

    // Submit (Enter or click send button)
    const sendButton = mainWindow.locator(
      'button[data-testid="send-button"], button[aria-label*="send" i], button[type="submit"]'
    )
    if (await sendButton.first().isVisible()) {
      await sendButton.first().click()
    } else {
      await chatInput.first().press('Enter')
    }

    // Wait for assistant response to appear
    // The response should contain "2"
    const assistantMessage = mainWindow.locator(
      '[data-testid="assistant-message"], [data-role="assistant"], .assistant-message'
    )
    await assistantMessage
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 })

    const text = await assistantMessage.first().textContent()
    expect(text).toBeTruthy()
    expect(text).toContain('2')
  })

  test('new chat appears in sidebar history', async ({ mainWindow }) => {
    // After sending a message, sidebar should show the new chat. shadcn's
    // Sidebar tags its root with data-slot="sidebar", not data-testid /
    // <nav> / <aside> — match that first to avoid the timeout we saw on CI.
    const sidebar = mainWindow.locator(
      '[data-slot="sidebar"], [data-testid="sidebar"], nav, aside'
    )
    await sidebar.first().waitFor({ state: 'visible', timeout: 5_000 })

    // There should be at least one history item
    const historyItem = sidebar.locator(
      '[data-testid="chat-history-item"], a[href*="chat/"]'
    )
    const count = await historyItem.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })
})
