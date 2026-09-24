/**
 * E2E: editing memory from the chat — the memory-change strip with Undo and
 * the "used memories" line with its popover, on the kernel's scripted
 * provider (no API key).
 *
 * Skeleton: the ids and the intended steps are fixed here; the faux provider
 * does not yet script an `update_memory` call or a memory read, so the flow is
 * `fixme` until that script exists (it is filled in and run with it).
 */
import { TEST_IDS } from '../../packages/shared/src/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'

test.describe('editing memory from the chat', () => {
  test.fixme('a correction shows the strip, opens to its changes and undoes them', async ({
    mainWindow
  }) => {
    // 1. Seed a memory entry, send a correction the faux provider answers
    //    with an `update_memory` call.
    // 2. The strip reads "Memory updated · <key>".
    const strip = mainWindow.getByTestId(TEST_IDS.chat.memoryStrip.root)
    await expect(strip).toBeVisible({ timeout: 30_000 })
    // 3. The toggle opens it to the change, before → after.
    const toggle = mainWindow.getByTestId(TEST_IDS.chat.memoryStrip.toggle)
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    // 4. Undo reverts it: the strip reads "Undone" and the button is gone.
    await mainWindow.getByTestId(TEST_IDS.chat.memoryStrip.undo).click()
    await expect(
      mainWindow.getByTestId(TEST_IDS.chat.memoryStrip.undo)
    ).toHaveCount(0)
  })

  test.fixme('the used-memories line lists them and "This is wrong" prefills the composer', async ({
    mainWindow
  }) => {
    // 1. Seed a memory entry with "use memory in chat" on; send a question
    //    the memory filter picks it for.
    // 2. The line under the reply names it; the popover lists it.
    await mainWindow.getByTestId(TEST_IDS.chat.usedMemories.trigger).click()
    await expect(
      mainWindow.getByTestId(TEST_IDS.chat.usedMemories.popover)
    ).toBeVisible()
    // 3. "This is wrong" prefills the composer, caret at the end, focused.
    await mainWindow
      .getByTestId(TEST_IDS.chat.usedMemories.wrong)
      .first()
      .click()
    const composer = mainWindow.getByTestId(TEST_IDS.composer.textarea)
    await expect(composer).toBeFocused()
    await expect(composer).toHaveValue(/is wrong: $/u)
    // 4. "Open in Settings" lands on the Memory page.
    await mainWindow.getByTestId(TEST_IDS.chat.usedMemories.trigger).click()
    await mainWindow
      .getByTestId(TEST_IDS.chat.usedMemories.openSettings)
      .click()
    await expect(mainWindow).toHaveURL(/tab=memory/u)
  })
})
