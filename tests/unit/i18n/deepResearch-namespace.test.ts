import { readFileSync } from 'fs'
import { join } from 'path'

import { describe, expect, it } from 'vitest'

const deepResearch = JSON.parse(
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
      'deepResearch.json'
    ),
    'utf8'
  )
)

describe('deepResearch namespace (en)', () => {
  it('has the settings form keys', () => {
    expect(deepResearch.form.breadth.description).toBe(
      'Generate multiple search queries to explore different aspects of your topic at each level. Default: 4.'
    )
    expect(deepResearch.form.depth.description).toBe(
      'Recursively dive deeper, following leads and uncovering connections for each branch. Default: 2.'
    )
  })

  it('has real pluralization for the sources tab', () => {
    expect(deepResearch.tabs).toMatchObject({
      activity: 'Activity',
      sources_one: '{{count}} Source',
      sources_other: '{{count}} Sources'
    })
  })

  it('has real pluralization and query interpolation for progress messages', () => {
    expect(deepResearch.messages).toMatchObject({
      learnings_one:
        'Deep researched {{count}} item from the previous web resources',
      learnings_other:
        'Deep researched {{count}} items from the previous web resources',
      queriesDeeper_one:
        'Generated {{count}} search query for the previous researches',
      queriesDeeper_other:
        'Generated {{count}} search queries for the previous researches',
      queriesForTopic_one: 'Generated {{count}} search query for "{{query}}"',
      queriesForTopic_other:
        'Generated {{count}} search queries for "{{query}}"',
      searchedFor: 'Searched for "{{query}}"'
    })
    expect(deepResearch.messages.complete.description).toBe(
      'The in-depth report for "{{query}}" has been fully generated. Hope it\'s helpful to you!'
    )
  })

  it('has the source-list headings', () => {
    expect(deepResearch.sources).toMatchObject({
      citations: 'Citations',
      more: 'More'
    })
  })
})
