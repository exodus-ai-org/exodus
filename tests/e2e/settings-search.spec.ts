import { TEST_IDS } from '../../src/shared/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'

test.describe('Settings — Search', () => {
  test.skip(
    !process.env.ELASTIC_URL,
    'requires ELASTIC_URL env var to test a real Elasticsearch connection'
  )

  test('test connection and reindex report success against a configured cluster', async ({
    mainWindow
  }) => {
    await mainWindow.evaluate(
      async ({ url, username, password }) => {
        await fetch('http://localhost:60223/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: 'global',
            search: { elasticsearch: { url, username, password } }
          })
        })
      },
      {
        url: process.env.ELASTIC_URL,
        username: process.env.ELASTIC_USERNAME ?? '',
        password: process.env.ELASTIC_PASSWORD ?? ''
      }
    )

    const modKey = process.platform === 'darwin' ? 'Meta' : 'Control'
    await mainWindow.keyboard.press(`${modKey}+,`)
    await mainWindow
      .getByRole('button', { name: 'Elasticsearch', exact: true })
      .click()

    await mainWindow.getByTestId(TEST_IDS.search.testConnectionButton).click()
    await expect(
      mainWindow.getByText('Connected to Elasticsearch')
    ).toBeVisible({ timeout: 10_000 })

    await mainWindow.getByTestId(TEST_IDS.search.reindexButton).click()
    await expect(mainWindow.getByText(/Reindexed \d+ messages/)).toBeVisible({
      timeout: 10_000
    })

    // Restore — leave Elasticsearch unconfigured for other tests/dev use.
    await mainWindow.evaluate(async () => {
      await fetch('http://localhost:60223/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'global',
          search: { elasticsearch: { url: '' } }
        })
      })
    })
  })
})
