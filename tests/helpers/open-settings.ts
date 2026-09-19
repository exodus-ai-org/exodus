import type { Page } from '@playwright/test'

/**
 * Open the Settings page, optionally a section of its left nav ("General",
 * "AI Providers", …). Uses the Cmd/Ctrl+, shortcut: the sidebar has no
 * Settings button (it lives in the account menu), which is what these specs'
 * old generic locators were looking for. The electron fixture releases the
 * composer's initial focus, so the shortcut is not swallowed.
 */
export async function openSettings(page: Page, section?: string) {
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control'
  await page.keyboard.press(`${mod}+,`)
  await page.waitForURL(/#\/settings/, { timeout: 10_000 })
  if (section) {
    await page.getByRole('button', { name: section, exact: true }).click()
  }
}
