// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import { LazyLoadImage } from '@/components/lazy-load-image'

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  document.body.replaceChildren()
})

async function mount(props: Parameters<typeof LazyLoadImage>[0]) {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  await act(async () => root.render(createElement(LazyLoadImage, props)))
  return { host, root }
}

// Every network image goes through this component (owner, 2026-09-30), so
// it carries what the bare <img>s it replaces needed.
describe('LazyLoadImage', () => {
  it('shows a skeleton until the image has loaded, then fades it in', async () => {
    const { host } = await mount({ src: 'https://x.example/a.jpg', alt: 'a' })
    expect(host.querySelector('[data-slot="skeleton"]')).not.toBeNull()
    const img = host.querySelector('img')!
    expect(img.className).toContain('opacity-0')
    await act(async () => img.dispatchEvent(new Event('load')))
    expect(host.querySelector('[data-slot="skeleton"]')).toBeNull()
    expect(img.className).toContain('opacity-100')
  })

  it('passes the referrer policy some hosts need (Google avatars, news sites)', async () => {
    const { host } = await mount({
      src: 'https://x.example/a.jpg',
      alt: 'a',
      referrerPolicy: 'no-referrer'
    })
    expect(host.querySelector('img')?.getAttribute('referrerpolicy')).toBe(
      'no-referrer'
    )
  })

  it('shows the caller’s fallback when the image fails', async () => {
    const { host } = await mount({
      src: 'https://x.example/gone.jpg',
      alt: 'a',
      fallback: createElement('span', { 'data-testid': 'fb' }, 'Y')
    })
    await act(async () =>
      host.querySelector('img')!.dispatchEvent(new Event('error'))
    )
    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('[data-testid="fb"]')?.textContent).toBe('Y')
  })

  it('sizes its own failure icon to the box, so a small tile does not overflow', async () => {
    const { host } = await mount({ src: 'https://x.example/g.jpg', alt: 'a' })
    await act(async () =>
      host.querySelector('img')!.dispatchEvent(new Event('error'))
    )
    const icon = host.querySelector('svg')
    expect(icon?.getAttribute('class')).toContain('size-1/3')
  })

  it('merges the image’s own classes over the default fit', async () => {
    const { host } = await mount({
      src: 'https://x.example/a.jpg',
      alt: 'a',
      imgClassName: 'object-contain'
    })
    const cls = host.querySelector('img')!.className
    expect(cls).toContain('object-contain')
    expect(cls).not.toContain('object-cover')
  })

  it('holds room for a picture of no set size while it loads', async () => {
    const { host } = await mount({
      src: 'https://x.example/a.jpg',
      alt: 'a',
      className: 'size-auto',
      loadingClassName: 'min-h-40'
    })
    const box = host.firstElementChild as HTMLElement
    expect(box.className).toContain('min-h-40')
    await act(async () =>
      host.querySelector('img')!.dispatchEvent(new Event('load'))
    )
    expect(box.className).not.toContain('min-h-40')
  })
})
