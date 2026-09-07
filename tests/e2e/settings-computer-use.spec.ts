import { TEST_IDS } from '../../src/shared/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'

test.describe('Settings — Computer Use', () => {
  test('renders the enable toggle and adds an allowlist target', async ({
    mainWindow
  }) => {
    const modKey = process.platform === 'darwin' ? 'Meta' : 'Control'
    await mainWindow.keyboard.press(`${modKey}+,`)
    await mainWindow
      .getByRole('button', { name: 'Computer Use', exact: true })
      .click()

    await expect(
      mainWindow.getByTestId(TEST_IDS.computerUse.enableToggle)
    ).toBeVisible()

    // The allowlist is a combobox of installed apps — type to filter, then
    // pick "Chess" from the dropdown (it's a stock macOS app, always present).
    const input = mainWindow.getByTestId(TEST_IDS.computerUse.allowlistInput)
    await input.click()
    await input.fill('Chess')
    await mainWindow.getByRole('option', { name: 'Chess' }).first().click()

    await expect(mainWindow.getByText('Chess')).toBeVisible()
  })
})
