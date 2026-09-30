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

  it('keeps the rest of the attributes as JSON, without the stack it showed', async () => {
    const host = await render({
      'exception.type': 'TypeError',
      'exception.stacktrace': STACK,
      'exception.stacktrace_raw': RAW,
      chatId: 'c1'
    })
    const json = host.querySelector('[data-log-attributes]')
    expect(json).not.toBeNull()
    expect(JSON.parse(json!.textContent ?? '')).toEqual({
      'exception.type': 'TypeError',
      'exception.stacktrace_raw': RAW,
      chatId: 'c1'
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
    expect(
      JSON.parse(host.querySelector('[data-log-attributes]')!.textContent ?? '')
    ).toEqual({ toolName: 'weather' })
  })

  it('shows only the JSON when there is no stack', async () => {
    const host = await render({ chatId: 'c1' })
    expect(blocks(host)).toEqual([])
    expect(
      JSON.parse(host.querySelector('[data-log-attributes]')!.textContent ?? '')
    ).toEqual({ chatId: 'c1' })
  })

  it('shows no empty JSON block under a stack that was all there was', async () => {
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
