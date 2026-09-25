import { TEST_IDS } from '../../packages/shared/src/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'

/**
 * The Cmd+F find bar is a sub-app of its own (a WebContentsView docked under
 * the header, `sub-apps/searchbar/`), mounted outside the main window's
 * provider tree. When `useSettings()` moved onto React Query it crashed on
 * mount and showed nothing, and no test noticed; this opens it through the
 * app menu item and requires its input to render.
 */
test.describe('Find bar', () => {
  test('Find… in the app menu opens the bar with its input', async ({
    electronApp,
    mainWindow
  }) => {
    await expect(
      mainWindow.getByTestId(TEST_IDS.composer.textarea)
    ).toBeVisible()

    const clicked = await electronApp.evaluate(({ Menu }) => {
      type Item = Electron.MenuItem
      const walk = (items: Item[]): Item | undefined => {
        for (const item of items) {
          if (item.accelerator === 'CmdOrCtrl+F') return item
          const inner = item.submenu ? walk(item.submenu.items) : undefined
          if (inner) return inner
        }
        return undefined
      }
      const item = walk(Menu.getApplicationMenu()?.items ?? [])
      item?.click()
      return !!item
    })
    expect(clicked).toBe(true)

    await expect
      .poll(
        () =>
          electronApp
            .context()
            .pages()
            .some((p) => p.url().includes('searchbar')),
        { timeout: 15_000 }
      )
      .toBe(true)
    const bar = electronApp
      .context()
      .pages()
      .find((p) => p.url().includes('searchbar'))!
    await expect(bar.getByTestId(TEST_IDS.findInPage.input)).toBeVisible()
  })
})
