import { TEST_IDS } from '../../packages/shared/src/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'
import { openSettings } from '../helpers/open-settings'

test.describe('Settings — Experiments', () => {
  test('the Markdown engine switch is remembered by the window', async ({
    mainWindow
  }) => {
    await openSettings(mainWindow, 'Experiments')

    const select = mainWindow.getByTestId(
      TEST_IDS.experiments.markdownEngineSelect
    )
    await select.waitFor({ state: 'visible', timeout: 10_000 })
    await expect(select).toContainText('Exodus')

    await select.click()
    await mainWindow.getByRole('option', { name: 'Streamdown' }).click()
    await expect(select).toContainText('Streamdown')
    await expect
      .poll(() =>
        mainWindow.evaluate(() =>
          window.localStorage.getItem('exodus-markdown-engine')
        )
      )
      .toBe('streamdown')

    // And back, so the next test in this window starts on the default.
    await select.click()
    await mainWindow.getByRole('option', { name: 'Exodus' }).click()
    await expect(select).toContainText('Exodus')
  })
})
