import { knowledgeDoc, settings } from '@main/lib/db/schema'
import { describe, expect, it } from 'vitest'

describe('knowledge base schema', () => {
  it('knowledge_doc has the sync-tracking columns and no teamId', () => {
    const cols = Object.keys(knowledgeDoc)
    expect(cols).toEqual(
      expect.arrayContaining([
        'lightragDocId',
        'lightragTrackId',
        'indexStatus',
        'indexError',
        'syncedHash'
      ])
    )
    expect(cols).not.toContain('teamId')
  })

  it('settings has a knowledgeBase column', () => {
    expect(Object.keys(settings)).toContain('knowledgeBase')
  })
})
