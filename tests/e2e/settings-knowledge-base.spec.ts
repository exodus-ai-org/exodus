import { TEST_IDS } from '../../src/shared/constants/test-ids'
import { electronTest as test, expect } from '../fixtures/electron'

test.describe('Settings — Knowledge Base', () => {
  test('renders the connection form and the add-document dialog', async ({
    mainWindow
  }) => {
    const modKey = process.platform === 'darwin' ? 'Meta' : 'Control'
    await mainWindow.keyboard.press(`${modKey}+,`)
    await mainWindow
      .getByRole('button', { name: 'Knowledge Base', exact: true })
      .click()

    await expect(
      mainWindow.getByPlaceholder('http://localhost:9621')
    ).toBeVisible()

    await expect(
      mainWindow.getByTestId(TEST_IDS.knowledgeBase.testConnectionButton)
    ).toBeVisible()

    // Configure a URL so the Documents section appears.
    await mainWindow
      .getByPlaceholder('http://localhost:9621')
      .fill('http://localhost:9621')
    await expect(
      mainWindow.getByTestId(TEST_IDS.knowledgeBase.reindexButton)
    ).toBeVisible()
    await mainWindow.getByTestId(TEST_IDS.knowledgeBase.addButton).click()
    await expect(
      mainWindow.getByTestId(TEST_IDS.knowledgeBase.docDialog)
    ).toBeVisible()

    await mainWindow
      .getByTestId(TEST_IDS.knowledgeBase.docTitleInput)
      .fill('Handbook')
    await mainWindow
      .getByTestId(TEST_IDS.knowledgeBase.docContentInput)
      .fill('The office opens at 9.')
    await mainWindow.getByTestId(TEST_IDS.knowledgeBase.docSaveButton).click()

    await expect(mainWindow.getByText('Handbook')).toBeVisible()
    await expect(mainWindow.getByText('Pending')).toBeVisible()

    // cleanup: delete the doc + clear the URL so reruns start clean
    await mainWindow.evaluate(async () => {
      const r = await fetch(
        'http://localhost:60223/api/knowledge-base/documents'
      )
      const docs = (await r.json()) as { id: string; title: string }[]
      for (const d of docs.filter((x) => x.title === 'Handbook')) {
        await fetch(
          `http://localhost:60223/api/knowledge-base/documents/${d.id}`,
          { method: 'DELETE' }
        )
      }
      await fetch('http://localhost:60223/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'global', knowledgeBase: { url: '' } })
      })
    })
  })
})
