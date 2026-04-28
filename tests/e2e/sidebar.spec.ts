/**
 * E2E: Sidebar navigation and interaction.
 */
import { electronTest as test, expect } from '../fixtures/electron'

test.describe('Sidebar', () => {
  test('sidebar is visible on launch', async ({ mainWindow }) => {
    // shadcn's <Sidebar /> tags its root with data-slot="sidebar" rather than
    // rendering a <nav> / <aside>; match that first, fall back to the older
    // selectors for any plain-HTML sidebar.
    const sidebar = mainWindow.locator(
      '[data-slot="sidebar"], [data-testid="sidebar"], nav, aside'
    )
    await sidebar.first().waitFor({ state: 'visible', timeout: 10_000 })
    expect(await sidebar.first().isVisible()).toBe(true)
  })

  test('sidebar contains navigation elements', async ({ mainWindow }) => {
    await mainWindow.waitForTimeout(2_000)

    const bodyText = await mainWindow.textContent('body')

    // Should have some navigation elements (Settings, new chat, etc.)
    const hasNavigation =
      bodyText?.includes('Settings') ||
      bodyText?.includes('New') ||
      bodyText?.includes('Chat') ||
      bodyText?.includes('Project')

    expect(hasNavigation).toBe(true)
  })
})
