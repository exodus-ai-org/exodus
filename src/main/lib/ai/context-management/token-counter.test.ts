import { describe, expect, it } from 'vitest'

import {
  estimateJsonTokens,
  estimateMessageTokens,
  estimateTokens
} from './token-counter'

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })

  it('estimates tokens based on character count', () => {
    // 7 chars / 3.5 = 2
    expect(estimateTokens('hello!!')).toBe(2)
  })

  it('rounds up to the nearest integer', () => {
    // 1 char / 3.5 = 0.28... → ceil = 1
    expect(estimateTokens('a')).toBe(1)
  })

  it('handles long text', () => {
    const text = 'a'.repeat(350)
    expect(estimateTokens(text)).toBe(100)
  })
})

describe('estimateJsonTokens', () => {
  it('estimates tokens for a simple object', () => {
    const obj = { key: 'value' }
    const json = JSON.stringify(obj) // '{"key":"value"}' = 15 chars
    expect(estimateJsonTokens(obj)).toBe(Math.ceil(json.length / 3.5))
  })

  it('handles nested objects', () => {
    const obj = { a: { b: { c: 'deep' } } }
    const json = JSON.stringify(obj)
    expect(estimateJsonTokens(obj)).toBe(Math.ceil(json.length / 3.5))
  })

  it('handles arrays', () => {
    const arr = [1, 2, 3]
    const json = JSON.stringify(arr)
    expect(estimateJsonTokens(arr)).toBe(Math.ceil(json.length / 3.5))
  })
})

describe('estimateMessageTokens', () => {
  it('adds MESSAGE_OVERHEAD (8) to json token count', () => {
    const content = { role: 'user', text: 'hi' }
    const jsonTokens = estimateJsonTokens(content)
    expect(estimateMessageTokens(content)).toBe(jsonTokens + 8)
  })
})
