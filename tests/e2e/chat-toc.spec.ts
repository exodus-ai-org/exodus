import { TEST_IDS } from '../../src/shared/constants/test-ids'
import { ApiClient } from '../fixtures/api-client'
/**
 * E2E: the Chat table-of-contents rail (user-message navigation).
 * Needs a real LLM to build a multi-turn conversation — skipped without a key,
 * same as chat-e2e.spec.ts.
 */
import { electronTest as test, expect } from '../fixtures/electron'
import { injectOpenAiProvider } from '../helpers/settings-inject'

test.describe('Chat TOC', () => {
  test.skip(
    !process.env.OPENAI_API_KEY,
    'requires OPENAI_API_KEY to drive a multi-turn chat'
  )

  test.beforeEach(async ({ mainWindow: _mw }) => {
    await injectOpenAiProvider(new ApiClient())
  })

  test('rail appears after 2 user messages, expands on hover, jumps on click', async ({
    mainWindow
  }) => {
    const input = mainWindow
      .locator('textarea, [contenteditable="true"], [data-testid="chat-input"]')
      .first()
    await input.waitFor({ state: 'visible', timeout: 10_000 })

    const send = async (text: string) => {
      await input.fill(text)
      await input.press('Enter')
      await mainWindow
        .locator('[data-testid="assistant-message"], [data-role="assistant"]')
        .last()
        .waitFor({ state: 'visible', timeout: 30_000 })
    }

    // One user message → no rail yet.
    await send('First question: what is 1 + 1? Answer with only the number.')
    await expect(
      mainWindow.getByTestId(TEST_IDS.chatToc.rail)
    ).not.toBeAttached()

    // Two → the rail shows.
    await send('Second question: what is 2 + 2? Answer with only the number.')
    const rail = mainWindow.getByTestId(TEST_IDS.chatToc.rail)
    await expect(rail).toBeVisible()

    // Hover expands it to a list of entries.
    await rail.hover()
    const entries = mainWindow.getByTestId(TEST_IDS.chatToc.entry)
    await expect(entries).toHaveCount(2)

    // Clicking the first entry scrolls it back into view.
    await entries.first().click()
    await expect(
      mainWindow.getByText('First question:', { exact: false })
    ).toBeInViewport()
  })
})
