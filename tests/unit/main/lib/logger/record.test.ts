import { join } from 'node:path'

import {
  severityOf,
  stackFramesOf,
  toAttributes
} from '@main/lib/logger/record'
import {
  resetSourceMapsForTests,
  setSourceMapRootForTests
} from '@main/lib/logger/source-map'
import { afterEach, describe, expect, it } from 'vitest'

import { buildThrowingBundle } from '../../../helpers/built-bundle'

describe('severityOf', () => {
  it('maps each level to its OpenTelemetry-style severity number/text', () => {
    expect(severityOf('debug')).toEqual({
      severityNumber: 5,
      severityText: 'DEBUG'
    })
    expect(severityOf('info')).toEqual({
      severityNumber: 9,
      severityText: 'INFO'
    })
    expect(severityOf('warn')).toEqual({
      severityNumber: 13,
      severityText: 'WARN'
    })
    expect(severityOf('error')).toEqual({
      severityNumber: 17,
      severityText: 'ERROR'
    })
  })
})

describe('toAttributes', () => {
  it('returns an empty object for null/undefined detail', () => {
    expect(toAttributes(null)).toEqual({})
    expect(toAttributes(undefined)).toEqual({})
  })

  it('passes plain fields through unchanged', () => {
    expect(toAttributes({ queueName: 'jobs', count: 3 })).toEqual({
      queueName: 'jobs',
      count: 3
    })
  })

  it('expands an Error `error` field into exception.* attributes', () => {
    const err = new Error('boom')
    const attrs = toAttributes({ error: err, extra: 'kept' })
    expect(attrs['exception.type']).toBe('Error')
    expect(attrs['exception.message']).toBe('boom')
    expect(attrs['exception.stacktrace']).toBe(err.stack)
    // Nothing was mapped, so there is no second copy of the stack.
    expect(attrs).not.toHaveProperty('exception.stacktrace_raw')
    expect(attrs.extra).toBe('kept')
    expect(attrs.error).toBeUndefined()
  })

  it('stringifies a non-Error `error` field', () => {
    const attrs = toAttributes({ error: 'plain string error' })
    expect(attrs['exception.type']).toBe('Error')
    expect(attrs['exception.message']).toBe('plain string error')
  })
})

describe('toAttributes — a stack from a built file', () => {
  afterEach(() => resetSourceMapsForTests())

  it('records the source positions, and the stack as it was thrown beside them', async () => {
    const built = await buildThrowingBundle()
    try {
      setSourceMapRootForTests(join(built.app, '.vite'))
      const error = built.thrown()
      const attrs = toAttributes({ error, chatId: 'c1' })
      expect(attrs['exception.type']).toBe('TypeError')
      expect(attrs['exception.message']).toBe(
        "Cannot read properties of undefined (reading 'totalTokens')"
      )
      const mapped = attrs['exception.stacktrace'] as string
      expect(mapped.split('\n')[1]).toMatch(
        /^ {4}at \S+ \(src\/main\/lib\/boom\.ts:7:\d+\)$/u
      )
      expect(mapped).not.toContain(built.file)
      expect(attrs['exception.stacktrace_raw']).toBe(error.stack)
      expect(attrs.chatId).toBe('c1')
    } finally {
      built.remove()
    }
  })
})

describe('stackFramesOf', () => {
  afterEach(() => resetSourceMapsForTests())

  // A DrizzleQueryError's message holds the statement and its parameters.
  const MESSAGE =
    'Failed query: insert into "message" values ($1)\nparams: {"apiKey":"sk-super-secret"},\n    at the start of a line'

  it('is the frames of the stack, without the name or the message', () => {
    const error = new Error(MESSAGE)
    error.name = 'DrizzleQueryError'
    const frames = stackFramesOf(error)!
    expect(frames).not.toContain('sk-super-secret')
    expect(frames).not.toContain('Failed query')
    expect(frames).not.toContain('DrizzleQueryError')
    expect(frames).not.toContain('at the start of a line')
    const lines = frames.split('\n')
    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) expect(line).toMatch(/^ {4}at /u)
    expect(lines[0]).toContain('record.test.ts')
  })

  it('keeps nothing of a message the stack no longer starts with', () => {
    const error = new Error(MESSAGE)
    // The message was replaced after the stack was taken.
    error.message = 'something else'
    const frames = stackFramesOf(error)!
    expect(frames).not.toContain('sk-super-secret')
    for (const line of frames.split('\n')) expect(line).toMatch(/^ {4}at /u)
  })

  it('maps the frames like any other stack', async () => {
    const built = await buildThrowingBundle()
    try {
      setSourceMapRootForTests(join(built.app, '.vite'))
      const frames = stackFramesOf(built.thrown())!
      expect(frames.split('\n')[0]).toMatch(
        /^ {4}at \S+ \(src\/main\/lib\/boom\.ts:7:\d+\)$/u
      )
      expect(frames).not.toContain('totalTokens')
    } finally {
      built.remove()
    }
  })

  it('is undefined for what has no stack', () => {
    expect(stackFramesOf('a string')).toBeUndefined()
    expect(stackFramesOf(null)).toBeUndefined()
    expect(stackFramesOf({ message: 'x' })).toBeUndefined()
    const bare = new Error('x')
    bare.stack = undefined
    expect(stackFramesOf(bare)).toBeUndefined()
    bare.stack = 'Error: x'
    expect(stackFramesOf(bare)).toBeUndefined()
  })

  it('rides a log call under exception.stacktrace, beside a name', () => {
    const error = new Error(MESSAGE)
    const attrs = toAttributes({
      errorName: error.name,
      'exception.stacktrace': stackFramesOf(error)
    })
    expect(JSON.stringify(attrs)).not.toContain('sk-super-secret')
    expect(attrs['exception.stacktrace']).toMatch(/^ {4}at /u)
    expect(attrs).not.toHaveProperty('exception.message')
  })
})
