/**
 * E2E: Settings → Appearance — presets, colours, import/copy, fonts, window.
 */
import type { Page } from '@playwright/test'

import { TEST_IDS } from '../../packages/shared/src/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'
import { openSettings } from '../helpers/open-settings'

const cssVar = (page: Page, name: string) =>
  page.evaluate(
    (n) =>
      getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
    name
  )

const htmlClass = (page: Page) =>
  page.evaluate(() => document.documentElement.className)

test.describe('Settings — Appearance', () => {
  test('a dark preset re-skins the tokens, is saved, and survives a reload without the cache', async ({
    mainWindow
  }) => {
    await openSettings(mainWindow, 'Appearance')
    await mainWindow.getByTestId(`${TEST_IDS.settings.themeMode}-dark`).click()
    await expect.poll(() => htmlClass(mainWindow)).toContain('dark')

    await mainWindow
      .getByTestId(`${TEST_IDS.appearance.presetSelect}-dark`)
      .click()
    await mainWindow.getByRole('option', { name: 'GitHub' }).click()
    await expect.poll(() => cssVar(mainWindow, '--background')).toBe('#0d1117')
    await expect(
      mainWindow.getByTestId(
        `${TEST_IDS.appearance.colorInput}-dark-background`
      )
    ).toHaveValue('#0d1117')

    // Persisted through the autosave, not merely applied.
    await expect
      .poll(() =>
        mainWindow.evaluate(async () => {
          const res = await fetch('http://localhost:60223/api/v1/settings')
          const s = await res.json()
          return s?.appearance?.dark?.preset ?? null
        })
      )
      .toBe('github')

    await mainWindow.evaluate(() =>
      window.localStorage.removeItem('exodus-appearance')
    )
    await mainWindow.reload()
    await expect.poll(() => cssVar(mainWindow, '--background')).toBe('#0d1117')
  })

  test('typing a hex colour and choosing a named accent update the tokens', async ({
    mainWindow
  }) => {
    await openSettings(mainWindow, 'Appearance')
    await mainWindow.getByTestId(`${TEST_IDS.settings.themeMode}-light`).click()
    await expect.poll(() => htmlClass(mainWindow)).not.toContain('dark')

    await mainWindow
      .getByTestId(`${TEST_IDS.appearance.colorInput}-light-background`)
      .fill('#fdf6e3')
    await expect.poll(() => cssVar(mainWindow, '--background')).toBe('#fdf6e3')
    await expect(
      mainWindow.getByTestId(`${TEST_IDS.appearance.presetSelect}-light`)
    ).toContainText('Custom')

    await mainWindow
      .getByTestId(`${TEST_IDS.appearance.accentSelect}-light`)
      .click()
    await mainWindow.getByRole('option', { name: 'Blue' }).click()
    await expect.poll(() => cssVar(mainWindow, '--primary')).toBe('#007aff')
  })

  test('import applies a pasted theme; copy puts JSON on the clipboard', async ({
    mainWindow,
    electronApp
  }) => {
    await openSettings(mainWindow, 'Appearance')
    await mainWindow.getByTestId(`${TEST_IDS.settings.themeMode}-light`).click()
    await expect.poll(() => htmlClass(mainWindow)).not.toContain('dark')

    await mainWindow
      .getByTestId(`${TEST_IDS.appearance.importTheme}-light`)
      .click()
    await mainWindow
      .getByTestId(TEST_IDS.appearance.importTextarea)
      .fill(
        '{"accent":"#268bd2","background":"#fdf6e3","foreground":"#586e75"}'
      )
    await mainWindow.getByTestId(TEST_IDS.appearance.importConfirm).click()
    await expect.poll(() => cssVar(mainWindow, '--foreground')).toBe('#586e75')

    await mainWindow
      .getByTestId(`${TEST_IDS.appearance.copyTheme}-light`)
      .click()
    await expect
      .poll(() => electronApp.evaluate(({ clipboard }) => clipboard.readText()))
      .toContain('"foreground": "#586e75"')
  })

  test('fonts, contrast and (macOS) translucency controls apply live', async ({
    mainWindow
  }) => {
    await openSettings(mainWindow, 'Appearance')

    await mainWindow.getByTestId(TEST_IDS.appearance.uiFontSelect).click()
    await mainWindow.getByRole('option', { name: 'Monospace' }).click()
    await expect
      .poll(() => cssVar(mainWindow, '--font-ui'))
      .toMatch(/^ui-monospace/u)
    await mainWindow.getByTestId(TEST_IDS.appearance.uiFontWeight).click()
    await mainWindow.getByRole('option', { name: 'Medium' }).click()
    await expect
      .poll(() => cssVar(mainWindow, '--font-weight-base'))
      .toBe('500')

    // Content follows the UI font by default → its weight select is disabled.
    await expect(
      mainWindow.getByTestId(TEST_IDS.appearance.contentFontWeight)
    ).toBeDisabled()
    await mainWindow.getByTestId(TEST_IDS.appearance.contentFontSelect).click()
    await mainWindow.getByRole('option', { name: 'Custom…' }).click()
    await mainWindow
      .getByTestId(`${TEST_IDS.appearance.customFontInput}-content`)
      .fill('Inter')
    await expect
      .poll(() => cssVar(mainWindow, '--font-content'))
      .toMatch(/^"Inter"/u)

    const borderBefore = await cssVar(mainWindow, '--border')
    const thumb = mainWindow
      .getByTestId(TEST_IDS.appearance.contrastSlider)
      .locator('[data-slot=slider-thumb]')
    await thumb.focus()
    await mainWindow.keyboard.press('ArrowRight')
    await expect(mainWindow.getByText('55', { exact: true })).toBeVisible()
    await expect
      .poll(() => cssVar(mainWindow, '--border'))
      .not.toBe(borderBefore)

    if (process.platform === 'darwin') {
      await mainWindow
        .getByTestId(TEST_IDS.appearance.translucentSidebar)
        .click()
      await expect
        .poll(() =>
          mainWindow.evaluate(
            () => document.documentElement.dataset.translucentSidebar
          )
        )
        .toBe('false')
    }
  })
})
