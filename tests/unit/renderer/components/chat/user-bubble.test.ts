// @vitest-environment happy-dom
// What the user said is Markdown, and a long message opens clipped under a
// "Show more" — measured by its height, never by its length.
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const t = (key: string) => key
const i18n = { resolvedLanguage: 'en', language: 'en' }
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t, i18n }) }))

const { UserBubble, collapses } = await import('@/components/chat/user-bubble')

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>
let scrollHeight = 0
const realScrollHeight = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'scrollHeight'
)

beforeEach(() => {
  scrollHeight = 0
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get: () => scrollHeight
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  if (realScrollHeight)
    Object.defineProperty(
      HTMLElement.prototype,
      'scrollHeight',
      realScrollHeight
    )
})

const show = (text: string) =>
  act(async () => root.render(createElement(UserBubble, { text })))
const showMore = () =>
  Array.from(host.querySelectorAll('button')).find(
    (b) => b.textContent === 'messageList.showMore'
  )

describe('collapses', () => {
  it('clips only content taller than the cap', () => {
    expect(collapses(100, 260)).toBe(false)
    expect(collapses(260, 260)).toBe(false)
    // Subpixel layout a fraction over the cap is not a clip.
    expect(collapses(260.8, 260)).toBe(false)
    expect(collapses(400, 260)).toBe(true)
  })
})

describe('the user bubble', () => {
  it('renders Markdown', async () => {
    await show('a **bold** word and `code`')

    expect(host.querySelector('strong')?.textContent).toBe('bold')
    expect(host.querySelector('code')?.textContent).toBe('code')
    expect(host.querySelector('[data-askable]')).not.toBeNull()
  })

  it('keeps a short message whole, with no "Show more"', async () => {
    scrollHeight = 40
    await show('just a question')

    expect(showMore()).toBeUndefined()
    expect(host.querySelector('[data-clipped]')).toBeNull()
  })

  it('clips a tall message under "Show more", and opens it for good', async () => {
    scrollHeight = 2000
    await show('a long paste')

    const button = showMore()!
    expect(button).toBeDefined()
    expect(button.getAttribute('aria-expanded')).toBe('false')
    const clip = host.querySelector<HTMLElement>('[data-clipped]')!
    expect(clip.style.maxHeight).not.toBe('')

    await act(async () => button.click())

    expect(showMore()).toBeUndefined()
    expect(host.querySelector('[data-clipped]')).toBeNull()
    const content = host.querySelector<HTMLElement>('[data-askable] > div')!
    expect(content.style.maxHeight).toBe('')
    expect(content.className).not.toContain('overflow-hidden')
  })
})
