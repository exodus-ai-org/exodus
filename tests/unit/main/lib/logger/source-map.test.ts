// A stack frame in a built file, mapped back to the source line it came
// from. The bundle and its map are real: Vite builds them the way the app's
// own build does (minified, `sourcemap: 'hidden'`), and the stack is what V8
// gave for the throw.
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  mapStackTrace,
  resetSourceMapsForTests,
  SOURCE_MAP_IDLE_MS
} from '@main/lib/logger/source-map'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import {
  buildThrowingBundle,
  type BuiltBundle
} from '../../../helpers/built-bundle'

let built: BuiltBundle
let root: string
let bundle: string
let stack: string
let asyncStack: string

beforeAll(async () => {
  built = await buildThrowingBundle()
  root = join(built.app, '.vite')
  bundle = built.file
  stack = built.thrown().stack ?? ''
  asyncStack = (await built.thrownAsync()).stack ?? ''
})

afterAll(() => built.remove())

afterEach(() => {
  vi.useRealTimers()
  resetSourceMapsForTests()
})

describe('the fixture', () => {
  it('is a minified bundle with a hidden map beside it', () => {
    const js = readFileSync(bundle, 'utf8')
    expect(js).not.toContain('sourceMappingURL')
    expect(js).not.toContain('readTotal')
    expect(stack).toContain(`${bundle}:1:`)
    expect(stack).not.toContain('boom.ts')
  })
})

describe('mapStackTrace', () => {
  it('maps a frame in a built file to the source line that threw', () => {
    const mapped = mapStackTrace(stack, { root })
    const [message, first, second] = mapped.split('\n')
    expect(message).toBe(
      "TypeError: Cannot read properties of undefined (reading 'totalTokens')"
    )
    // `return (usage as Usage).totalTokens` is line 7 of boom.ts.
    expect(first).toMatch(/^ {4}at \S+ \(src\/main\/lib\/boom\.ts:7:\d+\)$/u)
    // …called from `return readTotal(undefined)`, line 4 of main.ts.
    expect(second).toMatch(/^ {4}at .+ \(src\/main\/main\.ts:4:\d+\)$/u)
    expect(mapped).not.toContain(bundle)
  })

  it('keeps the function name, `async` and `[as alias]` of a frame', () => {
    const generated = stack.split('\n')[2]
    const name = /^ {4}at (.+) \(/u.exec(generated)![1]
    expect(name).toContain('[as run]')
    const mapped = mapStackTrace(stack, { root }).split('\n')[2]
    expect(mapped.startsWith(`    at ${name} (src/main/main.ts:4:`)).toBe(true)

    const asyncFrame = `    at async loadChat (${bundle}:1:91)`
    expect(mapStackTrace(asyncFrame, { root })).toMatch(
      /^ {4}at async loadChat \(src\/main\/lib\/boom\.ts:7:\d+\)$/u
    )
  })

  it('maps the async stack of a rejected promise', () => {
    const mapped = mapStackTrace(asyncStack, { root })
    expect(mapped).toMatch(/\(src\/main\/lib\/boom\.ts:7:\d+\)/u)
    // `return readTotal(undefined)` inside runAsync is line 9 of main.ts.
    expect(mapped).toMatch(/\(src\/main\/main\.ts:9:\d+\)/u)
  })

  it('maps a frame with no function name', () => {
    expect(mapStackTrace(`    at ${bundle}:1:91`, { root })).toMatch(
      /^ {4}at src\/main\/lib\/boom\.ts:7:\d+$/u
    )
    expect(mapStackTrace(`    at async ${bundle}:1:91`, { root })).toMatch(
      /^ {4}at async src\/main\/lib\/boom\.ts:7:\d+$/u
    )
  })

  it('maps a `file://` frame, as the packaged renderer reports them', () => {
    const url = pathToFileURL(bundle).href
    expect(url.startsWith('file:///')).toBe(true)
    const reported = stack.replaceAll(bundle, url)
    const mapped = mapStackTrace(reported, { root })
    expect(mapped).toMatch(/\(src\/main\/lib\/boom\.ts:7:\d+\)/u)
    expect(mapped).not.toContain('file://')
  })

  it('maps a React component stack the same way', () => {
    const url = pathToFileURL(bundle).href
    const componentStack = [
      '',
      `    at WeatherCard (${url}:1:91)`,
      '    at div (<anonymous>)',
      '    at div',
      `    at ErrorBoundary (${url}:1:123)`
    ].join('\n')
    expect(mapStackTrace(componentStack, { root }).split('\n')).toEqual([
      '',
      expect.stringMatching(
        /^ {4}at WeatherCard \(src\/main\/lib\/boom\.ts:7:\d+\)$/u
      ),
      '    at div (<anonymous>)',
      '    at div',
      expect.stringMatching(
        /^ {4}at ErrorBoundary \(src\/main\/main\.ts:4:\d+\)$/u
      )
    ])
  })

  it('leaves every frame it cannot map exactly as it was', () => {
    const lines = [
      'Error: boom',
      '    at runScriptInThisContext (node:internal/vm:219:10)',
      '    at node:internal/main/eval_string:71:3',
      '    at Chat (http://localhost:5173/src/renderer/components/chat.tsx:12:3)',
      '    at async Promise.all (index 0)',
      '    at <anonymous>',
      `    at eval (eval at run (${bundle}:1:91), <anonymous>:1:1)`,
      // No position past the end of the file's mappings.
      `    at late (${bundle}:999:1)`,
      // A built file with no map beside it.
      `    at bare (${join(root, 'build', 'no-map.js')}:1:1)`,
      'not a frame at all'
    ]
    writeFileSync(join(root, 'build', 'no-map.js'), 'void 0')
    const text = lines.join('\n')
    expect(mapStackTrace(text, { root })).toBe(text)
  })

  it('returns the very same string when nothing was mapped', () => {
    const text = 'Error: boom\n    at x (node:internal/vm:219:10)'
    expect(mapStackTrace(text, { root })).toBe(text)
    expect(mapStackTrace('', { root })).toBe('')
  })

  it('does nothing without a root', () => {
    expect(mapStackTrace(stack, { root: null })).toBe(stack)
    // The default root is the running build's own `.vite`; a test run has
    // none, so nothing is read.
    expect(mapStackTrace(stack)).toBe(stack)
  })

  it('reads a map only for a file under the root', async () => {
    // The same bundle and map, somewhere else: a client names the path in
    // what it reports, so a path is no reason to read a file.
    const elsewhere = await buildThrowingBundle('dist')
    try {
      const frame = `    at e (${elsewhere.file}:1:91)`
      expect(mapStackTrace(frame, { root })).toBe(frame)
      // …nor one that climbs out of the root.
      const climbing = `    at e (${join(root, 'build')}/../../..${elsewhere.file}:1:91)`
      expect(mapStackTrace(climbing, { root })).toBe(climbing)
      // It is a real, mappable bundle under a root of its own.
      expect(mapStackTrace(frame, { root: elsewhere.outDir })).toMatch(
        /boom\.ts:7:\d+\)$/u
      )
    } finally {
      elsewhere.remove()
    }
  })

  it('never throws: a broken map leaves the frame alone', () => {
    const broken = join(root, 'build', 'broken.js')
    writeFileSync(broken, 'void 0')
    writeFileSync(`${broken}.map`, '{ not json')
    const frame = `    at e (${broken}:1:1)`
    expect(mapStackTrace(frame, { root })).toBe(frame)

    const wrongShape = join(root, 'build', 'wrong-shape.js')
    writeFileSync(wrongShape, 'void 0')
    writeFileSync(`${wrongShape}.map`, '{"version":3,"mappings":42}')
    const other = `    at e (${wrongShape}:1:1)`
    expect(mapStackTrace(other, { root })).toBe(other)

    expect(mapStackTrace(undefined as unknown as string, { root })).toBe(
      undefined
    )
  })

  it('reads a map once, and lets it go after sitting idle', () => {
    vi.useFakeTimers()
    const copy = join(root, 'build', 'cached.js')
    writeFileSync(copy, readFileSync(bundle))
    writeFileSync(`${copy}.map`, readFileSync(`${bundle}.map`))
    const frame = `    at e (${copy}:1:91)`
    const mapped = mapStackTrace(frame, { root })
    expect(mapped).toMatch(/boom\.ts:7:\d+\)$/u)

    // The file is gone; the parsed map is still held.
    unlinkSync(`${copy}.map`)
    vi.advanceTimersByTime(SOURCE_MAP_IDLE_MS - 1)
    expect(mapStackTrace(frame, { root })).toBe(mapped)

    // Each use restarts the wait…
    vi.advanceTimersByTime(SOURCE_MAP_IDLE_MS - 1)
    expect(mapStackTrace(frame, { root })).toBe(mapped)

    // …and once it runs out, the map is read again — and is not there.
    vi.advanceTimersByTime(SOURCE_MAP_IDLE_MS)
    expect(mapStackTrace(frame, { root })).toBe(frame)
  })
})
