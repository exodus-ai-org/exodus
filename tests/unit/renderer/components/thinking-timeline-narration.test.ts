// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const t = (key: string) => key
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t }) }))
vi.mock('@/lib/i18n', () => ({ i18n: { t } }))
// Markdown carries its own paragraph size and colour: a row drawn with it
// stood apart from the rows around it (owner's screenshot, 2026-09-30).
vi.mock('@/components/markdown/markdown', () => ({
  default: ({ src }: { src: string }) =>
    createElement('div', { 'data-markdown': '' }, src)
}))

const { ThinkingTimeline } = await import('@/components/chat/thinking-timeline')

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
afterEach(() => {
  container?.remove()
  container = null
})

describe('a narration row in the timeline', () => {
  it('is drawn as the other rows are, not as Markdown', async () => {
    container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(
        createElement(ThinkingTimeline, {
          steps: [
            { type: 'narration', text: "I'll search for the latest on this." },
            {
              type: 'toolCall',
              text: 'Web Search: news',
              toolName: 'web_search'
            }
          ],
          durationMs: 37_000,
          isStreaming: false
        })
      )
    })
    await act(async () => {
      container?.querySelector('button')?.click()
    })

    const narration = [...container.querySelectorAll('p')].find(
      (p) => p.textContent === "I'll search for the latest on this."
    )
    const call = [...container.querySelectorAll('p')].find(
      (p) => p.textContent === 'Web Search: news'
    )
    expect(narration).toBeDefined()
    expect(container.querySelector('[data-markdown]')).toBeNull()
    // Same row styling as the tool call beside it.
    expect(narration?.parentElement?.className).toBe(
      call?.parentElement?.className
    )
    await act(async () => root.unmount())
  })
})
