import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  extractTextFromCompletion,
  parseJsonFromLlmResponse
} from './llm-response-util'

describe('extractTextFromCompletion', () => {
  it('extracts text from content parts', () => {
    const content = [
      { type: 'text', text: 'Hello' },
      { type: 'text', text: ' world' }
    ]
    expect(extractTextFromCompletion(content)).toBe('Hello world')
  })

  it('ignores non-text parts', () => {
    const content = [
      { type: 'image', url: 'http://example.com' },
      { type: 'text', text: 'Only this' },
      { type: 'tool_call', name: 'search' }
    ]
    expect(extractTextFromCompletion(content)).toBe('Only this')
  })

  it('returns empty string for empty content', () => {
    expect(extractTextFromCompletion([])).toBe('')
  })

  it('returns empty string when no text parts exist', () => {
    const content = [{ type: 'image', url: 'http://example.com' }]
    expect(extractTextFromCompletion(content)).toBe('')
  })
})

describe('parseJsonFromLlmResponse', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number()
  })
  const fallback = { name: '', age: 0 }

  it('parses valid JSON from text', () => {
    const text = 'Here is the result: {"name": "Alice", "age": 30}'
    expect(parseJsonFromLlmResponse(text, schema, fallback)).toEqual({
      name: 'Alice',
      age: 30
    })
  })

  it('extracts JSON embedded in surrounding text', () => {
    const text = 'Some preamble\n{"name": "Bob", "age": 25}\nSome epilogue'
    expect(parseJsonFromLlmResponse(text, schema, fallback)).toEqual({
      name: 'Bob',
      age: 25
    })
  })

  it('returns fallback when no JSON found', () => {
    expect(parseJsonFromLlmResponse('no json here', schema, fallback)).toEqual(
      fallback
    )
  })

  it('returns fallback when JSON does not match schema', () => {
    const text = '{"name": 123, "age": "not a number"}'
    expect(parseJsonFromLlmResponse(text, schema, fallback)).toEqual(fallback)
  })

  it('returns fallback for malformed JSON', () => {
    const text = '{broken json'
    expect(parseJsonFromLlmResponse(text, schema, fallback)).toEqual(fallback)
  })

  it('handles multiline JSON', () => {
    const text = `Result:
{
  "name": "Charlie",
  "age": 40
}
Done.`
    expect(parseJsonFromLlmResponse(text, schema, fallback)).toEqual({
      name: 'Charlie',
      age: 40
    })
  })
})
