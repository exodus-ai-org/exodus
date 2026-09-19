import { TEST_IDS } from '../../packages/shared/src/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'

/**
 * Settings → Developer → Chat Audit on a fresh profile: build a snapshot of
 * the (empty) database, run a preset, then a hand-written query, and check
 * the results frame and CSV button. DuckDB loads from node_modules here, the
 * same way the unpackaged app does.
 */
test.describe('Settings — Chat Audit', () => {
  test('builds a snapshot and runs queries against it', async ({
    mainWindow
  }) => {
    const modKey = process.platform === 'darwin' ? 'Meta' : 'Control'
    await mainWindow.keyboard.press(`${modKey}+,`)
    await mainWindow
      .getByRole('button', { name: 'Chat Audit', exact: true })
      .click()

    const build = mainWindow.getByTestId(TEST_IDS.chatAudit.buildButton)
    await expect(build).toBeEnabled({ timeout: 20_000 })
    await build.click()
    // The open-folder button only appears once a snapshot exists.
    await expect(
      mainWindow.getByTestId(TEST_IDS.chatAudit.openFolderButton)
    ).toBeVisible({ timeout: 60_000 })

    // A preset fills the editor and runs; an empty profile yields no rows.
    await mainWindow
      .getByTestId(TEST_IDS.chatAudit.presetButton)
      .first()
      .click()
    await expect(
      mainWindow.getByTestId(TEST_IDS.chatAudit.sqlInput)
    ).toHaveValue(/FROM messages/)
    await expect(
      mainWindow.getByText('The query returned no rows')
    ).toBeVisible({
      timeout: 30_000
    })

    // A hand-written query renders a results table and enables CSV export.
    await mainWindow
      .getByTestId(TEST_IDS.chatAudit.sqlInput)
      .fill("SELECT 42 AS answer, 'ok' AS status")
    await mainWindow.getByTestId(TEST_IDS.chatAudit.runButton).click()
    const table = mainWindow.getByTestId(TEST_IDS.chatAudit.resultsTable)
    await expect(table).toBeVisible({ timeout: 30_000 })
    await expect(table).toContainText('answer')
    await expect(table).toContainText('42')
    await expect(
      mainWindow.getByTestId(TEST_IDS.chatAudit.downloadCsvButton)
    ).toBeEnabled()
  })
})
