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

    await mainWindow
      .getByTestId(TEST_IDS.computerUse.allowlistInput)
      .fill('Chess')
    await mainWindow.getByTestId(TEST_IDS.computerUse.addTargetButton).click()

    await expect(mainWindow.getByText('Chess')).toBeVisible()
  })
})
