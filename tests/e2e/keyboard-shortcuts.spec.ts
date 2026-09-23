import { TEST_IDS } from '../../packages/shared/src/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'

test.describe('Keyboard shortcuts', () => {
  test('Mod+Shift+E puts the caret back in the composer', async ({
    mainWindow
  }) => {
    const composer = mainWindow.getByTestId(TEST_IDS.composer.textarea)
    await expect(composer).toBeVisible()

    // The composer autofocuses; move focus away so the shortcut has work to do.
    await composer.evaluate((el) => (el as HTMLElement).blur())
    await expect(composer).not.toBeFocused()

    const modKey = process.platform === 'darwin' ? 'Meta' : 'Control'
    await mainWindow.keyboard.press(`${modKey}+Shift+E`)

    await expect(composer).toBeFocused()
  })
})
