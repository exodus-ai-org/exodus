import { TEST_IDS } from '../../src/shared/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'

test.describe('Settings — Logger', () => {
  test('renders the standardized log table with scope filter and trace pivot', async ({
    mainWindow
  }) => {
    const modKey = process.platform === 'darwin' ? 'Meta' : 'Control'
    await mainWindow.keyboard.press(`${modKey}+,`)
    await mainWindow
      .getByRole('button', { name: 'Logger', exact: true })
      .click()

    // Scope dropdown (replaces the old static "Surface" list).
    await expect(
      mainWindow.getByTestId(TEST_IDS.logger.scopeSelect)
    ).toBeVisible()

    // The server logs "Hono is running" (scope: server) at startup, so there
    // is at least one row. Trace badges only appear on traced records.
    const traceBadge = mainWindow
      .getByTestId(TEST_IDS.logger.traceBadge)
      .first()
    if (await traceBadge.count()) {
      await traceBadge.click()
      await expect(
        mainWindow.getByTestId(TEST_IDS.logger.traceFilterChip)
      ).toBeVisible()
      await mainWindow.getByTestId(TEST_IDS.logger.traceFilterChip).click()
      await expect(
        mainWindow.getByTestId(TEST_IDS.logger.traceFilterChip)
      ).toHaveCount(0)
    }
  })
})
