// @vitest-environment happy-dom
// Waiting for the first sign of an answer looks like what follows it: the
// orb of the thinking timeline, where the timeline's orb will be.
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('thinking-orbs', () => ({
  ThinkingOrb: ({ state, size }: { state: string; size: number }) =>
    createElement('canvas', { 'data-orb': `${state}:${size}` })
}))

const { MessageSpinner } = await import('@/components/message-spinner')

describe('<MessageSpinner>', () => {
  it('is the working orb at the timeline’s size, announced as a status', async () => {
    const host = document.createElement('div')
    await act(async () =>
      createRoot(host).render(createElement(MessageSpinner))
    )

    const status = host.querySelector('[role="status"]')
    expect(status?.getAttribute('aria-live')).toBe('polite')
    expect(status?.querySelector('[data-orb]')?.getAttribute('data-orb')).toBe(
      'working:20'
    )
  })
})
