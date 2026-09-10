import { webFetch } from '@main/lib/ai/calling-tools/web-fetch'
import type { WebSearchResult } from '@shared/types/web-search'
import { afterEach, describe, expect, it, vi } from 'vitest'

const loadDocument = vi.fn()
vi.mock('@main/lib/ai/utils/web-search-util', () => ({
  loadDocument: (...a: unknown[]) => loadDocument(...a)
}))

afterEach(() => loadDocument.mockReset())

describe('webFetch', () => {
  it('registers the page in the shared rank map and prefixes a [N] header', async () => {
    loadDocument.mockResolvedValue({
      ogImage: 'https://img/og.png',
      type: 'html',
      content: '# BLS PPI Release\n\nFinal demand rose 0.4 percent in August.'
    })
    const sources = new Map<string, WebSearchResult>()
    const tool = webFetch(sources)
    const out = await tool.execute('c1', { url: 'https://www.bls.gov/x.htm' })

    expect(sources.get('https://www.bls.gov/x.htm')).toMatchObject({
      rank: 1,
      link: 'https://www.bls.gov/x.htm',
      title: 'BLS PPI Release',
      hostname: 'bls.gov',
      thumbnail: 'https://img/og.png'
    })
    const text = out.content[0].type === 'text' ? out.content[0].text : ''
    expect(text).toContain('[1] BLS PPI Release')
    expect(text).toContain('【1-source】')
    expect(text).toContain('Final demand rose 0.4 percent')
  })

  it('reuses the existing rank when the same URL is fetched twice', async () => {
    loadDocument.mockResolvedValue({
      ogImage: '',
      type: 'html',
      content: 'body'
    })
    const sources = new Map<string, WebSearchResult>([
      ['https://a.com', { rank: 3 } as WebSearchResult]
    ])
    const tool = webFetch(sources)
    const out = await tool.execute('c1', { url: 'https://a.com' })
    expect(sources.size).toBe(1)
    const text = out.content[0].type === 'text' ? out.content[0].text : ''
    expect(text).toContain('【3-source】')
  })

  it('works without a rank map (no header, plain details)', async () => {
    loadDocument.mockResolvedValue({ ogImage: '', type: 'html', content: 'hi' })
    const out = await webFetch().execute('c1', { url: 'https://a.com' })
    const text = out.content[0].type === 'text' ? out.content[0].text : ''
    expect(text).toBe('hi')
    expect(out.details).toEqual({ url: 'https://a.com', length: 2 })
  })

  it('throws when the fetch fails', async () => {
    loadDocument.mockResolvedValue(null)
    await expect(
      webFetch().execute('c1', { url: 'https://a.com' })
    ).rejects.toThrow('Failed to fetch')
  })
})
