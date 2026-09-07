import { extractSearchableText } from '@main/lib/search/extract-searchable-text'
import { describe, expect, it } from 'vitest'

describe('extractSearchableText', () => {
  it('returns null for toolResult messages regardless of content', () => {
    expect(
      extractSearchableText({
        role: 'toolResult',
        content: [{ type: 'text', text: 'web search results here' }]
      })
    ).toBeNull()
  })

  it('joins text blocks and skips thinking blocks', () => {
    expect(
      extractSearchableText({
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'internal reasoning' },
          { type: 'text', text: 'Hello' },
          { type: 'text', text: 'world' }
        ]
      })
    ).toBe('Hello\nworld')
  })

  it('returns the string as-is when content is a plain string', () => {
    expect(
      extractSearchableText({ role: 'user', content: 'plain string content' })
    ).toBe('plain string content')
  })

  it('returns null for empty string content', () => {
    expect(extractSearchableText({ role: 'user', content: '' })).toBeNull()
  })

  it('returns null for an empty content array', () => {
    expect(extractSearchableText({ role: 'assistant', content: [] })).toBeNull()
  })

  it('returns null when only thinking blocks are present', () => {
    expect(
      extractSearchableText({
        role: 'assistant',
        content: [{ type: 'thinking', thinking: 'internal reasoning' }]
      })
    ).toBeNull()
  })

  it('excludes text blocks with empty text', () => {
    expect(
      extractSearchableText({
        role: 'assistant',
        content: [
          { type: 'text', text: '' },
          { type: 'text', text: 'kept' }
        ]
      })
    ).toBe('kept')
  })

  it('returns null for non-array, non-string content', () => {
    expect(
      extractSearchableText({ role: 'user', content: { weird: true } })
    ).toBeNull()
  })
})
