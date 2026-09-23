/**
 * E2E: Settings → Built-in Tools. Every tool has a switch; the three with
 * something to set up have a panel, open by default, and a Configure
 * disclosure that folds it away. On a fresh data dir no key is set, so a
 * tool that is on and needs one says what is missing.
 */
import { TEST_IDS } from '../../packages/shared/src/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'

test.describe('Settings — Built-in Tools', () => {
  test('renders the rows, and the configurable tools open their panels', async ({
    mainWindow
  }) => {
    const modKey = process.platform === 'darwin' ? 'Meta' : 'Control'
    await mainWindow.keyboard.press(`${modKey}+,`)
    await mainWindow
      .getByRole('button', { name: 'Built-in Tools', exact: true })
      .click()

    const toggles = mainWindow.getByTestId(TEST_IDS.tools.toggle)
    await expect(toggles.first()).toBeVisible()
    // One switch per registered tool, three Configure disclosures.
    expect(await toggles.count()).toBeGreaterThan(10)
    await expect(mainWindow.getByTestId(TEST_IDS.tools.configure)).toHaveCount(
      3
    )

    const byTool = (id: string, tool: string) =>
      mainWindow.locator(`[data-testid="${id}"][data-tool="${tool}"]`)

    // Web search's panel is open by default, with the key input in it; the
    // tool is on and has no Brave key yet, so the row says what is missing.
    const configure = byTool(TEST_IDS.tools.configure, 'web_search')
    const panel = byTool(TEST_IDS.tools.panel, 'web_search')
    await expect(configure).toHaveAttribute('aria-expanded', 'true')
    await expect(panel).toBeVisible()
    await expect(panel.getByPlaceholder('BSA...')).toBeVisible()
    await expect(
      mainWindow.getByText('Needs a Brave Search API key')
    ).toBeVisible()

    // Configure folds it away (the panel loses its height) and back.
    await configure.click()
    await expect(configure).toHaveAttribute('aria-expanded', 'false')
    await expect(panel).not.toBeVisible()
    await configure.click()
    await expect(panel).toBeVisible()

    // A tool with nothing to configure has a switch and no disclosure.
    await expect(byTool(TEST_IDS.tools.toggle, 'terminal')).toBeVisible()
    await expect(byTool(TEST_IDS.tools.configure, 'terminal')).toHaveCount(0)
  })
})
