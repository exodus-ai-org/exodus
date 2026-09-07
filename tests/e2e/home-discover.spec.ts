import { TEST_IDS } from '../../src/shared/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'

test.describe('Home — Discover', () => {
  test('shows no Discover section when the feature is off (the default)', async ({
    mainWindow
  }) => {
    await expect(mainWindow.getByText('Hello there!')).toBeVisible()
    await expect(
      mainWindow.getByTestId(TEST_IDS.discover.section)
    ).not.toBeAttached()
    // Dark-by-default: the greeting stays vertically centered, not top-aligned.
    await expect(
      mainWindow.getByText('Hello there!').locator('..')
    ).toHaveClass(/justify-center/)
  })
})
