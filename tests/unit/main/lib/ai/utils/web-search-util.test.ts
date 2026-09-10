import {
  pickAgeLabel,
  webResultsToSources
} from '@main/lib/ai/utils/web-search-util'
import { describe, expect, it } from 'vitest'

describe('webResultsToSources', () => {
  it('flattens web + news + discussions, deduping by url', () => {
    const flat = webResultsToSources({
      web: {
        results: [
          {
            title: 'A',
            url: 'https://a.com',
            description: 'desc a',
            extra_snippets: ['more a'],
            profile: { name: 'Site A' },
            meta_url: { hostname: 'a.com' }
          },
          { title: 'no content', url: 'https://x.com' }
        ]
      },
      news: {
        results: [{ title: 'A dup', url: 'https://a.com', description: 'dup' }]
      },
      discussions: {
        results: [
          {
            title: 'Q',
            url: 'https://forum.com/t',
            data: {
              forum_name: 'r/rust',
              num_answers: 3,
              question: 'how?',
              top_comment: 'like this'
            }
          }
        ]
      }
    })
    expect(flat.map((s) => s.url)).toEqual([
      'https://a.com',
      'https://forum.com/t'
    ])
    expect(flat[0].content).toBe('desc a\n\nmore a')
    expect(flat[0].siteName).toBe('Site A')
    expect(flat[1].content).toContain('[Forum: r/rust, 3 answers]')
    expect(flat[1].content).toContain('how?')
  })

  it('returns [] for a null response', () => {
    expect(webResultsToSources(null)).toEqual([])
  })
})

describe('pickAgeLabel', () => {
  it('prefers a relative label', () => {
    expect(
      pickAgeLabel(['Thursday, June 18, 2026', '2026-06-18', '5 days ago'])
    ).toBe('5 days ago')
  })

  it('falls back to the ISO date when no relative label', () => {
    expect(pickAgeLabel(['Monday, October 23, 2023', '2023-10-23'])).toBe(
      '2023-10-23'
    )
  })

  it('returns undefined for empty/missing input', () => {
    expect(pickAgeLabel([])).toBeUndefined()
    expect(pickAgeLabel(undefined)).toBeUndefined()
  })
})
