import { TEST_IDS } from '../../src/shared/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'

test.describe('Settings — Discover', () => {
  test('renders the toggle and the no-Brave-key hint by default', async ({
    mainWindow
  }) => {
    const modKey = process.platform === 'darwin' ? 'Meta' : 'Control'
    await mainWindow.keyboard.press(`${modKey}+,`)
    await mainWindow
      .getByRole('button', { name: 'Discover', exact: true })
      .click()

    await expect(
      mainWindow.getByTestId(TEST_IDS.discover.enableToggle)
    ).toBeVisible()
    await expect(
      mainWindow.getByText('Discover needs a Brave Search API key.')
    ).toBeVisible()
    await expect(
      mainWindow.getByRole('button', { name: 'Add one under Built-in Tools' })
    ).toBeVisible()
  })
})
