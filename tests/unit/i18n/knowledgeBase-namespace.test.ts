import { readFileSync } from 'fs'
import { join } from 'path'

import { describe, expect, it } from 'vitest'

const knowledgeBase = JSON.parse(
  readFileSync(
    join(
      __dirname,
      '..',
      '..',
      '..',
      'packages',
      'shared',
      'src',
      'i18n',
      'locales',
      'en',
      'knowledgeBase.json'
    ),
    'utf8'
  )
)

describe('knowledgeBase namespace (en)', () => {
  it('has the alert text with both <strong> spans', () => {
    expect(knowledgeBase.alert).toContain(
      '<strong>self-hosted LightRAG server that you run</strong>'
    )
    expect(knowledgeBase.alert).toContain(
      '<strong>locked once you ingest a document</strong>'
    )
  })

  it('has the query mode option keys', () => {
    expect(knowledgeBase.queryMode.options).toMatchObject({
      naive: 'Naive',
      local: 'Local',
      global: 'Global',
      hybrid: 'Hybrid',
      mix: 'Mix'
    })
  })

  it('has the doc list status keys', () => {
    expect(knowledgeBase.docList.status).toMatchObject({
      pending: 'Pending',
      processing: 'Indexing…',
      processed: 'Indexed',
      failed: 'Failed',
      stale: 'Needs reindex'
    })
    expect(knowledgeBase.docList.updatedAgo).toBe('Updated {{distance}} ago')
  })

  it('has the doc dialog keys, addTitle shared with the Documents section button', () => {
    expect(knowledgeBase.docDialog).toMatchObject({
      editTitle: 'Edit document',
      addTitle: 'Add document',
      titleLabel: 'Title',
      contentLabel: 'Content'
    })
  })

  it('has the delete dialog interpolated description', () => {
    expect(knowledgeBase.deleteDialog.description).toBe(
      '"{{title}}" will be removed from the knowledge base.'
    )
  })

  it('has real pluralization for docsCount and reindexQueued', () => {
    expect(knowledgeBase.toast).toMatchObject({
      docsCount_one: '{{count}} doc',
      docsCount_other: '{{count}} docs',
      reindexQueued_one: 'Queued {{count}} document for reindexing',
      reindexQueued_other: 'Queued {{count}} documents for reindexing'
    })
  })
})
