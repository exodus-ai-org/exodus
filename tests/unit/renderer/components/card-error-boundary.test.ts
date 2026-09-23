// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const t = (key: string, opts?: { what?: string }) =>
  key === 'renderFailed' ? `${opts?.what} could not be shown.` : key
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t }) }))
const report = vi.fn()
vi.mock('@/lib/report-error', () => ({
  reportRendererError: (...args: unknown[]) => report(...args)
}))

const { ErrorBoundary, RenderFailed } =
  await import('@/components/card-error-boundary')

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

function Boom({ fail }: { fail: boolean }) {
  if (fail)
    throw new Error(
      "Cannot read properties of undefined (reading 'weatherCode')"
    )
  return createElement('div', { 'data-card': 'ok' }, 'card')
}

beforeEach(() => report.mockClear())

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', async () => {
    const host = document.createElement('div')
    await act(async () =>
      createRoot(host).render(
        createElement(
          ErrorBoundary,
          { scope: 'tool-card', fallback: 'fallback' },
          createElement(Boom, { fail: false })
        )
      )
    )
    expect(host.querySelector('[data-card="ok"]')).not.toBeNull()
    expect(report).not.toHaveBeenCalled()
  })

  it('contains a throwing child to its fallback and reports it with scope and attributes', async () => {
    const host = document.createElement('div')
    // React logs the caught error to console.error; that is expected here.
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    await act(async () =>
      createRoot(host).render(
        createElement(
          ErrorBoundary,
          {
            scope: 'tool-card',
            attributes: { toolName: 'weather' },
            fallback: createElement(RenderFailed, { what: 'Weather' })
          },
          createElement(Boom, { fail: true })
        )
      )
    )
    quiet.mockRestore()
    expect(host.textContent).toContain('Weather could not be shown.')
    expect(host.querySelector('[role="alert"]')).not.toBeNull()
    expect(report).toHaveBeenCalledTimes(1)
    const [scope, error, attributes] = report.mock.calls[0] as [
      string,
      Error,
      object
    ]
    expect(scope).toBe('tool-card')
    expect(error.message).toMatch(/weatherCode/u)
    expect(attributes).toEqual({ toolName: 'weather' })
  })

  it('a fallback can be built from the error', async () => {
    const host = document.createElement('div')
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    await act(async () =>
      createRoot(host).render(
        createElement(
          ErrorBoundary,
          {
            scope: 'markdown',
            fallback: (e: Error) =>
              createElement('pre', null, `plain: ${e.message}`)
          },
          createElement(Boom, { fail: true })
        )
      )
    )
    quiet.mockRestore()
    expect(host.querySelector('pre')?.textContent).toMatch(/^plain: /u)
  })
})

describe('RenderFailed', () => {
  it('reads as a quiet system notice, never as the tool-failure box', async () => {
    const host = document.createElement('div')
    await act(async () =>
      createRoot(host).render(createElement(RenderFailed, { what: 'Weather' }))
    )
    const el = host.querySelector('[role="alert"]')
    expect(el?.textContent).toBe('Weather could not be shown.')
    // The tool-failure box (messages-calling-tools.tsx) is
    // border-destructive/bg-destructive; this is our own bug, not the
    // tool's, so it must not borrow that colour.
    expect(el?.className).not.toMatch(/destructive/u)
  })
})
