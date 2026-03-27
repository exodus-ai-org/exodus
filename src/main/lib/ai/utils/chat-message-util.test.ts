import type { ChatMessage } from '@shared/types/chat'
import { describe, expect, it, vi } from 'vitest'

// Mock the modules that transitively import Electron/DB
vi.mock('../../db/db', () => ({ pglite: {} }))
vi.mock('../../db/queries', () => ({}))
vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }))
vi.mock('@electric-sql/pglite', () => ({
  PGlite: class {
    // noop
    constructor() {} // eslint-disable-line @typescript-eslint/no-empty-function
  }
}))

const { getTextFromMessage } = await import('./chat-message-util')

describe('getTextFromMessage', () => {
  it('extracts text from user message with string content', () => {
    const msg = {
      role: 'user',
      content: 'Hello world'
    } as ChatMessage
    expect(getTextFromMessage(msg)).toBe('Hello world')
  })

  it('extracts text from user message with array content', () => {
    const msg = {
      role: 'user',
      content: [
        { type: 'text', text: 'Hello ' },
        { type: 'image', url: 'http://example.com/img.png' },
        { type: 'text', text: 'world' }
      ]
    } as ChatMessage
    expect(getTextFromMessage(msg)).toBe('Hello world')
  })

  it('extracts text from assistant message', () => {
    const msg = {
      role: 'assistant',
      content: [
        { type: 'text', text: 'I am an assistant' },
        { type: 'tool_call', name: 'search' }
      ]
    } as ChatMessage
    expect(getTextFromMessage(msg)).toBe('I am an assistant')
  })

  it('returns empty string when no text content', () => {
    const msg = {
      role: 'assistant',
      content: [{ type: 'tool_call', name: 'search' }]
    } as ChatMessage
    expect(getTextFromMessage(msg)).toBe('')
  })
})
