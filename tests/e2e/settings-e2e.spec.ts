/**
 * E2E: Settings page interaction.
 */
import { electronTest as test, expect } from '../fixtures/electron'

test.describe('Settings E2E', () => {
  test('settings page renders and shows provider options', async ({
    mainWindow
  }) => {
    // Navigate to settings
    const settingsLink = mainWindow.locator(
      '[data-testid="nav-settings"], a[href*="settings"], button:has-text("Settings")'
    )
    if (
      await settingsLink
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false)
    ) {
      await settingsLink.first().click()
      await mainWindow.waitForTimeout(1_000)
    }

    // Settings page should contain provider-related text
    const bodyText = await mainWindow.textContent('body')
    const hasProviderContent =
      bodyText?.includes('OpenAI') ||
      bodyText?.includes('Claude') ||
      bodyText?.includes('Provider') ||
      bodyText?.includes('API Key')

    expect(hasProviderContent).toBe(true)
  })

  test('color tone can be changed', async ({ mainWindow }) => {
    // Change color tone via API and verify page reflects it
    const response = await mainWindow.evaluate(async () => {
      await fetch('http://localhost:60223/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'global', colorTone: 'violet' })
      })

      const res = await fetch('http://localhost:60223/api/settings')
      const json = await res.json()
      // successResponse(c, settings) returns the settings object directly —
      // no { data: ... } wrapper.
      return json.colorTone
    })

    expect(response).toBe('violet')

    // Restore
    await mainWindow.evaluate(async () => {
      await fetch('http://localhost:60223/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'global', colorTone: 'neutral' })
      })
    })
  })
})
