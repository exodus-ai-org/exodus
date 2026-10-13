// @vitest-environment happy-dom
// Settings → Logger, an expanded row: a stack is shown as a block of its own,
// with real line breaks, and the attributes JSON does not repeat it.
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}))

const { LogAttributes, splitLogStacks } =
  await import('@/components/settings/settings-form/log-attributes')

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const STACK = [
  "TypeError: Cannot read properties of undefined (reading 'totalTokens')",
  '    at calculateCost (src/main/lib/ai/utils/cost.ts:7:27)',
  '    at toAssistant (src/main/lib/ai/kernel/run.ts:345:11)'
].join('\n')
const RAW = STACK.replaceAll('src/main/lib/ai', '/app.asar/.vite/build')
const COMPONENT_STACK = '\n    at WeatherCard\n    at ErrorBoundary'

async function render(attributes: Record<string, unknown> | undefined) {
  const host = document.createElement('div')
  await act(async () =>
    createRoot(host).render(createElement(LogAttributes, { attributes }))
  )
  return host
}

// The attributes table, as { key: the value as shown }.
const table = (host: HTMLElement) => {
  const el = host.querySelector('[data-log-attributes]')
  if (!el) return null
  return Object.fromEntries(
    [...el.querySelectorAll('[data-log-attribute]')].map((row) => [
      row.getAttribute('data-log-attribute'),
      row.lastElementChild?.textContent
    ])
  )
}

const blocks = (host: HTMLElement) =>
  [...host.querySelectorAll('[data-log-stack]')].map((el) => ({
    kind: el.getAttribute('data-log-stack'),
    label: el.querySelector('[data-log-stack-label]')?.textContent,
    text: el.querySelector('pre')?.textContent,
    className: el.querySelector('pre')?.className ?? ''
  }))

describe('splitLogStacks', () => {
  it("takes the logger's own stack, then a client's", () => {
    expect(
      splitLogStacks({ 'exception.stacktrace': STACK, chatId: 'c1' })
    ).toEqual({ stack: STACK, rest: { chatId: 'c1' } })
    expect(splitLogStacks({ stack: STACK, toolName: 'weather' })).toEqual({
      stack: STACK,
      rest: { toolName: 'weather' }
    })
  })

  it('shows one stack: what it does not show stays in the attributes', () => {
    expect(
      splitLogStacks({
        'exception.stacktrace': STACK,
        'exception.stacktrace_raw': RAW,
        stack: 'another'
      })
    ).toEqual({
      stack: STACK,
      rest: { 'exception.stacktrace_raw': RAW, stack: 'another' }
    })
  })

  it('takes the component stack', () => {
    expect(
      splitLogStacks({ stack: STACK, componentStack: COMPONENT_STACK })
    ).toEqual({ stack: STACK, componentStack: COMPONENT_STACK, rest: {} })
  })

  it('leaves alone what is not a stack', () => {
    expect(splitLogStacks({ stack: 42, componentStack: '' })).toEqual({
      rest: { stack: 42, componentStack: '' }
    })
    expect(splitLogStacks(undefined)).toEqual({ rest: {} })
  })
})

describe('LogAttributes', () => {
  it('shows a stack as a block of its own, line by line', async () => {
    const host = await render({
      'exception.type': 'TypeError',
      'exception.stacktrace': STACK,
      'exception.stacktrace_raw': RAW,
      chatId: 'c1'
    })
    const [stack, ...others] = blocks(host)
    expect(others).toEqual([])
    expect(stack.kind).toBe('stack')
    expect(stack.label).toBe('logger.details.stack')
    // The text itself, line breaks and all — not a JSON string with `\n` in it.
    expect(stack.text).toBe(STACK)
    expect(stack.text!.split('\n')).toHaveLength(3)
    // Preformatted, scrollable both ways, selectable.
    expect(stack.className).toMatch(/\bwhitespace-pre\b/u)
    expect(stack.className).toMatch(/\boverflow-auto\b/u)
    expect(stack.className).toMatch(/\bmax-h-/u)
    expect(stack.className).toMatch(/\bselect-text\b/u)
    expect(stack.className).toMatch(/\bfont-mono\b/u)
  })

  it('keeps the rest of the attributes as a table, without the stack it showed', async () => {
    const host = await render({
      'exception.type': 'TypeError',
      'exception.stacktrace': STACK,
      'exception.stacktrace_raw': RAW,
      chatId: 'c1',
      attempt: 2
    })
    // Sorted by key; a string keeps its quotes, a number does not.
    expect(table(host)).toEqual({
      attempt: '2',
      chatId: '"c1"',
      'exception.stacktrace_raw': JSON.stringify(RAW),
      'exception.type': '"TypeError"'
    })
  })

  it('notes a duration in milliseconds in seconds', async () => {
    const host = await render({ duration_ms: 5012, latencyMs: '1500', ms: 20 })
    expect(table(host)).toEqual({
      duration_ms: '5012// 5.0 s',
      latencyMs: '"1500"// 1.5 s',
      ms: '20'
    })
  })

  it('shows the component stack of a renderer report under the stack', async () => {
    const host = await render({
      toolName: 'weather',
      stack: STACK,
      componentStack: COMPONENT_STACK
    })
    expect(
      blocks(host).map(({ kind, label, text }) => [kind, label, text])
    ).toEqual([
      ['stack', 'logger.details.stack', STACK],
      // Without the line break React opens it with; every frame keeps its
      // indent, the first one too.
      [
        'componentStack',
        'logger.details.componentStack',
        '    at WeatherCard\n    at ErrorBoundary'
      ]
    ])
    expect(table(host)).toEqual({ toolName: '"weather"' })
  })

  it('shows only the table when there is no stack', async () => {
    const host = await render({ chatId: 'c1' })
    expect(blocks(host)).toEqual([])
    expect(table(host)).toEqual({ chatId: '"c1"' })
  })

  it('shows no empty table under a stack that was all there was', async () => {
    const host = await render({ stack: STACK })
    expect(blocks(host)).toHaveLength(1)
    expect(host.querySelector('[data-log-attributes]')).toBeNull()
  })

  it('shows nothing for a record with no attributes', async () => {
    expect((await render(undefined)).textContent).toBe('')
    expect((await render({})).textContent).toBe('')
  })

  it('uses no raw palette colour', async () => {
    const host = await render({ stack: STACK, chatId: 'c1' })
    expect(host.innerHTML).not.toMatch(
      /\b(?:bg|text|border)-(?:red|blue|green|yellow|orange|zinc|gray|slate|neutral|black|white)\b/u
    )
  })
})
