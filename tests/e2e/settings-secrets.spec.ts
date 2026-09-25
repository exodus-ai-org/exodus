import { TEST_IDS } from '../../packages/shared/src/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'
import { openSettings } from '../helpers/open-settings'

// Fake values only: nothing here ever reaches a provider.
const OPENAI_KEY = 'sk-e2e-not-a-real-key-WXYZ'
const MCP_TOKEN = 'ghp_e2eNotARealToken0000QRST'

test.describe('Settings — masked keys and the secrets status', () => {
  test('a saved key shows as its mask; a base-URL change says it clears the key, then asks for it', async ({
    mainWindow
  }) => {
    await mainWindow.evaluate(async (key) => {
      await fetch('http://localhost:60223/api/v1/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'global',
          providers: { openaiApiKey: key, openaiBaseUrl: null }
        })
      })
    }, OPENAI_KEY)
    // Reloaded so the settings are read again; the reloaded composer holds
    // focus, which swallows the Settings shortcut, so go by the deep link.
    await mainWindow.reload()
    await mainWindow.waitForLoadState('domcontentloaded')
    await mainWindow.evaluate(() => {
      window.location.hash = '#/settings?tab=ai-providers'
    })
    await mainWindow.getByRole('tab', { name: 'OpenAI' }).click()

    const key = mainWindow.locator(
      `[data-testid="${TEST_IDS.secrets.keyInput}"][data-field="providers.openaiApiKey"]`
    )
    await expect(key).toHaveValue('•••• WXYZ')
    await expect(key).toHaveAttribute('data-masked', 'true')
    // Nothing has been refused yet.
    await expect(
      mainWindow.getByTestId(TEST_IDS.providerModels.reenterError)
    ).toHaveCount(0)

    const baseUrl = mainWindow.getByPlaceholder('https://api.openai.com/v1')
    await baseUrl.focus()
    await expect(
      mainWindow.getByTestId(TEST_IDS.secrets.destinationHint)
    ).toBeVisible()

    await baseUrl.fill('https://proxy.example.invalid/v1')
    await baseUrl.blur()

    await expect(key).toHaveValue('', { timeout: 10_000 })
    await expect(
      mainWindow.getByTestId(TEST_IDS.secrets.reenterPrompt)
    ).toBeVisible()

    // The server recorded the move: the prompt survives a reload, and the
    // key is named on General.
    await mainWindow.reload()
    await mainWindow.waitForLoadState('domcontentloaded')
    await mainWindow.evaluate(() => {
      window.location.hash = '#/settings?tab=general'
    })
    await expect(
      mainWindow.getByTestId(TEST_IDS.secrets.reentryNotice)
    ).toContainText('OpenAI API key')
    await mainWindow.evaluate(() => {
      window.location.hash = '#/settings?tab=ai-providers'
    })
    await mainWindow.getByRole('tab', { name: 'OpenAI' }).click()
    await expect(key).toHaveValue('')
    await expect(
      mainWindow.getByTestId(TEST_IDS.secrets.reenterPrompt)
    ).toBeVisible()

    await key.fill('sk-e2e-typed-again-0000')
    await expect(
      mainWindow.getByTestId(TEST_IDS.secrets.reenterPrompt)
    ).toHaveCount(0)
  })

  test('General shows no re-entry notice on a fresh profile, and any keychain notice names the keychain', async ({
    mainWindow
  }) => {
    await openSettings(mainWindow, 'General')
    await expect(
      mainWindow.getByTestId(TEST_IDS.secrets.reentryNotice)
    ).toHaveCount(0)
    const keychain = mainWindow.getByTestId(TEST_IDS.secrets.encryptionNotice)
    if ((await keychain.count()) > 0) {
      await expect(keychain).toContainText(/keychain/iu)
    }
  })

  test('an MCP server shows its env masked, and a new command asks for its masked args again', async ({
    mainWindow
  }) => {
    await mainWindow.evaluate(async (token) => {
      await fetch('http://localhost:60223/api/v1/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'e2e-github',
          transportType: 'stdio',
          command: 'npx',
          args: ['-y', 'server-github', '--token', token],
          env: { GITHUB_TOKEN: token }
        })
      })
    }, MCP_TOKEN)

    await openSettings(mainWindow, 'MCP Servers')
    await mainWindow.getByRole('button', { name: 'Edit server' }).click()

    const env = mainWindow.getByTestId(TEST_IDS.mcpServers.envInput)
    await expect(env).toHaveValue(/•••• QRST/u)
    await expect(env).not.toHaveValue(new RegExp(MCP_TOKEN, 'u'))

    await mainWindow
      .getByPlaceholder(/server-filesystem/u)
      .first()
      .fill('uvx')
    await mainWindow
      .getByRole('button', { name: 'Update', exact: true })
      .click()

    const refusal = mainWindow.getByTestId(TEST_IDS.mcpServers.fieldError)
    await expect(refusal).toBeVisible()
    await expect(refusal).toHaveAttribute('data-field', 'args')
  })

  test('a remote MCP server warns before its address change clears the headers, then asks for them', async ({
    mainWindow
  }) => {
    await mainWindow.evaluate(async (token) => {
      await fetch('http://localhost:60223/api/v1/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'e2e-remote',
          transportType: 'sse',
          url: 'https://mcp.example.invalid/sse',
          headers: { Authorization: `Bearer ${token}` }
        })
      })
    }, MCP_TOKEN)

    await openSettings(mainWindow, 'MCP Servers')
    await mainWindow.getByRole('button', { name: 'Edit server' }).click()

    const url = mainWindow.getByPlaceholder('e.g. https://mcp.example.com/sse')
    await url.focus()
    await expect(
      mainWindow.getByTestId(TEST_IDS.secrets.destinationHint)
    ).toContainText('clears the saved headers')
    await url.fill('https://elsewhere.example.invalid/sse')
    await mainWindow
      .getByRole('button', { name: 'Update', exact: true })
      .click()

    const prompt = mainWindow.locator(
      `[data-testid="${TEST_IDS.secrets.reenterPrompt}"][data-field="mcp:e2e-remote"]`
    )
    await expect(prompt).toContainText('headers.Authorization')
  })
})
