/**
 * E2E: editing memory from the chat — the memory-change strip with Undo and
 * the "used memories" line with its popover, on the kernel's scripted
 * provider (no API key).
 *
 * The faux provider (`src/main/lib/ai/kernel/faux-boot.ts`) scripts two
 * extra flows beyond its default weather one: a correction that answers with
 * an `update_memory` tool call, and a question the memory read filter
 * answers for — both keyed off the exact seed/message constants in
 * `faux-memory-fixtures.ts`, so this spec and the script it drives never
 * drift apart. (Imported from the fixtures file, not `faux-boot.ts` itself,
 * which — like every other main-process module — pulls in `electron`
 * transitively and cannot load outside it.)
 */
import { TEST_IDS } from '../../packages/shared/src/constants/test-ids'
import {
  MEMORY_CORRECTION_MESSAGE,
  MEMORY_CORRECTION_RESULT,
  MEMORY_CORRECTION_SEED,
  MEMORY_USAGE_QUESTION,
  MEMORY_USAGE_SEED
} from '../../src/main/lib/ai/kernel/faux-memory-fixtures'
import { ApiClient } from '../fixtures/api-client'
import { electronTest as test, expect } from '../fixtures/electron'
import { openSettings } from '../helpers/open-settings'

async function useFauxProvider(api: ApiClient) {
  await api.updateSettings({
    providers: { openaiApiKey: 'faux' },
    providerConfig: { provider: 'OpenAI GPT', model: 'faux-1' }
  })
}

test.describe('editing memory from the chat', () => {
  test('a correction shows the strip, opens to its changes and undoes them', async ({
    mainWindow
  }) => {
    const api = new ApiClient()
    await useFauxProvider(api)
    // Memory read-in-chat off: this run's only memory work is the
    // correction itself, not the (unrelated) read filter.
    await api.updateSettings({
      memory: { useInChat: false, autoCapture: false }
    })
    const seeded = await api.createMemory(MEMORY_CORRECTION_SEED)
    const memoryId = (seeded.data as { id: string }).id

    const composer = mainWindow.getByTestId(TEST_IDS.composer.textarea)
    await composer.fill(MEMORY_CORRECTION_MESSAGE)
    await composer.press('Enter')

    // The strip settles on "Memory updated · Home OS" once the tool result
    // (and the engine call underneath it) comes back.
    const strip = mainWindow.getByTestId(TEST_IDS.chat.memoryStrip.root)
    await expect(strip).toContainText(MEMORY_CORRECTION_RESULT.key, {
      timeout: 30_000
    })

    // The toggle opens it to the change, before → after.
    const toggle = mainWindow.getByTestId(TEST_IDS.chat.memoryStrip.toggle)
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(strip).toContainText(MEMORY_CORRECTION_SEED.summary)
    await expect(strip).toContainText(MEMORY_CORRECTION_RESULT.summary)

    // Undo reverts it: the strip reads "Undone" and the button is gone.
    await mainWindow.getByTestId(TEST_IDS.chat.memoryStrip.undo).click()
    await expect(
      mainWindow.getByTestId(TEST_IDS.chat.memoryStrip.undo)
    ).toHaveCount(0)

    // The entry itself is back to what it was before the correction.
    const after = await api.getMemories()
    const restored = (after.data as Array<Record<string, unknown>>).find(
      (m) => m.id === memoryId
    )
    expect(restored?.summary).toBe(MEMORY_CORRECTION_SEED.summary)
  })

  test('the used-memories line lists them and "This is wrong" prefills the composer', async ({
    mainWindow
  }) => {
    const api = new ApiClient()
    await useFauxProvider(api)
    await api.updateSettings({
      memory: { useInChat: true, autoCapture: false }
    })
    await api.createMemory(MEMORY_USAGE_SEED)

    const composer = mainWindow.getByTestId(TEST_IDS.composer.textarea)
    await composer.fill(MEMORY_USAGE_QUESTION)
    await composer.press('Enter')

    // The line under the reply names it; the popover lists it.
    const trigger = mainWindow.getByTestId(TEST_IDS.chat.usedMemories.trigger)
    await expect(trigger).toBeVisible({ timeout: 30_000 })
    await expect(trigger).toContainText(MEMORY_USAGE_SEED.key)
    await trigger.click()
    const popover = mainWindow.getByTestId(TEST_IDS.chat.usedMemories.popover)
    await expect(popover).toBeVisible()
    await expect(popover).toContainText(MEMORY_USAGE_SEED.summary)

    // "This is wrong" prefills the composer, caret at the end, focused.
    await mainWindow
      .getByTestId(TEST_IDS.chat.usedMemories.wrong)
      .first()
      .click()
    await expect(composer).toBeFocused()
    await expect(composer).toHaveValue(/is wrong: $/u)

    // "Open in Settings" lands on the Memory page.
    await trigger.click()
    await mainWindow
      .getByTestId(TEST_IDS.chat.usedMemories.openSettings)
      .click()
    await expect(mainWindow).toHaveURL(/tab=memory/u)
  })

  test('Settings → Memory: a failed list read offers Retry, and Retry reads again', async ({
    mainWindow
  }) => {
    const api = new ApiClient()
    await api.createMemory(MEMORY_USAGE_SEED)

    // The page's list read fails (its one quick retry included) until the
    // route is released: the page must say so, not show "No memories yet".
    let failing = true
    await mainWindow.route(/\/api\/v1\/memory$/u, (route) =>
      failing && route.request().method() === 'GET'
        ? route.abort()
        : route.fallback()
    )
    await openSettings(mainWindow, 'Memory')

    const retry = mainWindow.getByTestId(TEST_IDS.memorySettings.retry)
    await expect(retry).toBeVisible({ timeout: 15_000 })

    failing = false
    await retry.click()
    await expect(retry).toHaveCount(0)
    await expect(mainWindow.getByText(MEMORY_USAGE_SEED.key)).toBeVisible()
  })
})
