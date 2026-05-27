import { WebPDFLoader } from '@langchain/community/document_loaders/web/pdf'
import type {
  WebSearchMediaKind,
  WebSearchMediaResult,
  WebSearchResult
} from '@shared/types/web-search'
import * as cheerio from 'cheerio'
import TurndownService from 'turndown'

/* ================= Constants ================= */

const TURNDOWN_OPTIONS = {
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
} as const

const BRAVE_API_BASE = 'https://api.search.brave.com/res/v1'

// Map our recency-filter values onto Brave's `freshness` codes.
// Brave has no past-hour bucket; collapse 'hour' to 'pd' (past day).
const BRAVE_FRESHNESS: Record<string, string> = {
  hour: 'pd',
  day: 'pd',
  week: 'pw',
  month: 'pm',
  year: 'py'
}

/* ================= URL-to-Markdown (for webFetch) ================= */

function getOgImageLink($: cheerio.CheerioAPI) {
  return (
    $('meta[property="og:image"]').attr('content') ??
    $('meta[name="og:image"]').attr('content') ??
    $('meta[name="twitter:image"]').attr('content') ??
    ''
  )
}

async function loadPdf(blob: Blob) {
  try {
    const loader = new WebPDFLoader(blob, { parsedItemSeparator: '' })
    const docs = await loader.load()
    return docs.map((d) => d.pageContent).join('\n')
  } catch {
    return ''
  }
}

function extractHtmlBody(html: string) {
  try {
    const $ = cheerio.load(html)

    $('script, style, noscript, iframe, svg, footer, nav, header').remove()

    return {
      ogImage: getOgImageLink($),
      html:
        $('article').html() ||
        $('#content').html() ||
        $('.content').html() ||
        $('#main').html() ||
        $('main').html() ||
        $('body').html() ||
        ''
    }
  } catch {
    return null
  }
}

function htmlToMarkdown(html: string) {
  const turndown = new TurndownService(TURNDOWN_OPTIONS)
  return turndown.turndown(html)
}

/** Built-in loader: cheerio + turndown (HTML) or LangChain (PDF) */
export async function loadDocumentBuiltin(link: string) {
  try {
    const response = await fetch(link)
    const contentType = response.headers.get('content-type') ?? ''

    if (contentType.includes('application/pdf')) {
      const blob = await response.blob()
      const pdf = await loadPdf(blob)
      return pdf ? { ogImage: '', type: 'pdf' as const, content: pdf } : null
    }

    if (contentType.includes('text/html')) {
      const html = await response.text()
      const dom = extractHtmlBody(html)
      if (!dom?.html) return null
      const markdown = htmlToMarkdown(dom.html)
      return markdown
        ? { ogImage: dom.ogImage, type: 'html' as const, content: markdown }
        : null
    }

    return null
  } catch {
    return null
  }
}

/**
 * Load a URL as markdown, used by the webFetch tool. Jina Reader is the
 * primary path (handles JS-rendered SPAs and most paywalled previews); if it
 * returns null we fall back to the built-in cheerio+turndown loader so a
 * single blocked or rate-limited Jina response doesn't break the agent's
 * fetch — the user no longer picks between them.
 */
export async function loadDocument(
  link: string
): Promise<{ ogImage: string; type: 'pdf' | 'html'; content: string } | null> {
  return (await loadDocumentWithJina(link)) ?? (await loadDocumentBuiltin(link))
}

/** Jina Reader loader */
export async function loadDocumentWithJina(link: string) {
  try {
    const response = await fetch(`https://r.jina.ai/${link}`, {
      headers: { Accept: 'text/plain' }
    })

    if (!response.ok) return null

    const content = await response.text()
    return content ? { ogImage: '', type: 'html' as const, content } : null
  } catch {
    return null
  }
}

/* ================= Brave LLM Context Search ================= */

// LLM Context returns a single Markdown summary plus the source list it used.
// `grounding.generic` is the per-source array we can map to our citation format.
type BraveLlmContextSource = {
  url: string
  title?: string
  snippets?: string[]
}

type BraveLlmContextSourceMeta = {
  title?: string
  hostname?: string
}

type BraveLlmContextResponse = {
  grounding?: {
    generic?: BraveLlmContextSource[]
  }
  sources?: Record<string, BraveLlmContextSourceMeta>
}

type BraveMediaThumbnail = {
  src?: string
}

type BraveImageResult = {
  title?: string
  url?: string
  source?: string
  thumbnail?: BraveMediaThumbnail
  properties?: {
    url?: string
    placeholder?: string
    width?: number
    height?: number
  }
}

type BraveImageSearchResponse = {
  results?: BraveImageResult[]
}

type BraveVideoResult = {
  title?: string
  url?: string
  description?: string
  age?: string
  duration?: string
  source?: string
  thumbnail?: BraveMediaThumbnail
  meta_url?: {
    hostname?: string
  }
}

type BraveVideoSearchResponse = {
  results?: BraveVideoResult[]
}

function buildCommonParams({
  query,
  country,
  languages,
  recencyFilter,
  maxResults
}: {
  query: string
  country?: string | null
  languages?: string[] | null
  recencyFilter?: string | null
  maxResults?: number | null
}) {
  const params = new URLSearchParams()
  params.set('q', query)
  if (country) params.set('country', country.toLowerCase())
  // Brave only takes a single primary language; pick the first the user picked.
  if (languages && languages.length > 0) {
    params.set('search_lang', languages[0])
  }
  if (recencyFilter && BRAVE_FRESHNESS[recencyFilter]) {
    params.set('freshness', BRAVE_FRESHNESS[recencyFilter])
  }
  if (maxResults && maxResults > 0) {
    // Brave caps `count` at 20 per call.
    params.set('count', String(Math.min(maxResults, 20)))
  }
  return params
}

async function fetchBraveLlmContext({
  query,
  apiKey,
  country,
  languages,
  recencyFilter,
  maxResults
}: {
  query: string
  apiKey: string
  country?: string | null
  languages?: string[] | null
  recencyFilter?: string | null
  maxResults?: number | null
}): Promise<BraveLlmContextResponse | null> {
  const params = buildCommonParams({
    query,
    country,
    languages,
    recencyFilter,
    maxResults
  })
  // Brave caps per-URL tokens at 8192; raise from the 4096 default so each
  // grounding source carries deeper context for the model.
  params.set('maximum_number_of_tokens_per_url', '8192')

  const res = await fetch(
    `${BRAVE_API_BASE}/llm/context?${params.toString()}`,
    {
      headers: {
        Accept: 'application/json',
        'x-subscription-token': apiKey
      }
    }
  )
  if (!res.ok) return null
  return (await res.json()) as BraveLlmContextResponse
}

async function fetchBraveImages({
  query,
  apiKey,
  country,
  languages,
  maxResults
}: {
  query: string
  apiKey: string
  country?: string | null
  languages?: string[] | null
  maxResults?: number | null
}): Promise<BraveImageSearchResponse | null> {
  const params = buildCommonParams({
    query,
    country,
    languages,
    maxResults: Math.min(maxResults ?? 6, 8)
  })
  params.set('safesearch', 'strict')

  const res = await fetch(
    `${BRAVE_API_BASE}/images/search?${params.toString()}`,
    {
      headers: {
        Accept: 'application/json',
        'x-subscription-token': apiKey
      }
    }
  )
  if (!res.ok) return null
  return (await res.json()) as BraveImageSearchResponse
}

async function fetchBraveVideos({
  query,
  apiKey,
  country,
  languages,
  recencyFilter,
  maxResults
}: {
  query: string
  apiKey: string
  country?: string | null
  languages?: string[] | null
  recencyFilter?: string | null
  maxResults?: number | null
}): Promise<BraveVideoSearchResponse | null> {
  const params = buildCommonParams({
    query,
    country,
    languages,
    recencyFilter,
    maxResults: Math.min(maxResults ?? 4, 6)
  })
  params.set('safesearch', 'moderate')

  const res = await fetch(
    `${BRAVE_API_BASE}/videos/search?${params.toString()}`,
    {
      headers: {
        Accept: 'application/json',
        'x-subscription-token': apiKey
      }
    }
  )
  if (!res.ok) return null
  return (await res.json()) as BraveVideoSearchResponse
}

function normalizeMediaUrl(url: string | undefined): string {
  if (!url) return ''
  try {
    return new URL(url).toString()
  } catch {
    return ''
  }
}

function imageResultsToMedia(
  resp: BraveImageSearchResponse | null,
  passesDomainFilter: (url: string) => boolean
): WebSearchMediaResult[] {
  if (!resp?.results) return []
  const media: WebSearchMediaResult[] = []
  const seen = new Set<string>()

  for (const r of resp.results) {
    const imageUrl = normalizeMediaUrl(r.properties?.url || r.thumbnail?.src)
    const sourceUrl = normalizeMediaUrl(r.url)
    if (!imageUrl || !sourceUrl) continue
    if (!passesDomainFilter(sourceUrl)) continue
    if (seen.has(imageUrl)) continue
    seen.add(imageUrl)

    media.push({
      kind: 'image',
      title: r.title || r.source || sourceUrl,
      url: imageUrl,
      sourceUrl,
      thumbnailUrl:
        normalizeMediaUrl(r.thumbnail?.src) ||
        normalizeMediaUrl(r.properties?.placeholder) ||
        undefined,
      source: r.source,
      width: r.properties?.width,
      height: r.properties?.height
    })
  }

  return media
}

function videoResultsToMedia(
  resp: BraveVideoSearchResponse | null,
  passesDomainFilter: (url: string) => boolean
): WebSearchMediaResult[] {
  if (!resp?.results) return []
  const media: WebSearchMediaResult[] = []
  const seen = new Set<string>()

  for (const r of resp.results) {
    const videoUrl = normalizeMediaUrl(r.url)
    if (!videoUrl) continue
    if (!passesDomainFilter(videoUrl)) continue
    if (seen.has(videoUrl)) continue
    seen.add(videoUrl)

    media.push({
      kind: 'video',
      title: r.title || r.meta_url?.hostname || videoUrl,
      url: videoUrl,
      sourceUrl: videoUrl,
      thumbnailUrl: normalizeMediaUrl(r.thumbnail?.src) || undefined,
      source: r.source || r.meta_url?.hostname,
      duration: r.duration,
      age: r.age
    })
  }

  return media
}

/**
 * Search the web via the Brave Search API and return structured results.
 *
 * Uses Brave LLM Context as the canonical source list and content that the LLM
 * grounds on. We intentionally avoid the parallel Web Search metadata call so
 * citation numbering, stored source data, and UI rendering all come from one
 * source of truth.
 */
export async function fetchWebSearch({
  query,
  braveApiKey,
  webSources,
  media = 'none',
  country,
  languages,
  maxResults,
  recencyFilter,
  domainFilter
}: {
  query: string
  braveApiKey: string
  webSources?: Map<string, WebSearchResult>
  media?: 'none' | WebSearchMediaKind | 'all'
  country?: string | null
  languages?: string[] | null
  maxResults?: number | null
  recencyFilter?: string | null
  domainFilter?: string[] | null
}): Promise<WebSearchResult[] | null> {
  try {
    const includeImages = media === 'image' || media === 'all'
    const includeVideos = media === 'video' || media === 'all'

    const [llmCtx, imageResp, videoResp] = await Promise.all([
      fetchBraveLlmContext({
        query,
        apiKey: braveApiKey,
        country,
        languages,
        recencyFilter,
        maxResults
      }),
      includeImages
        ? fetchBraveImages({
            query,
            apiKey: braveApiKey,
            country,
            languages
          })
        : Promise.resolve(null),
      includeVideos
        ? fetchBraveVideos({
            query,
            apiKey: braveApiKey,
            country,
            languages,
            recencyFilter
          })
        : Promise.resolve(null)
    ])

    // Brave doesn't accept a domain include/exclude filter at the API level
    // (Goggles aside), so we apply the user's comma-separated list here.
    // Entries prefixed with `-` exclude; bare entries include (or substring-
    // match for paths like `.edu`).
    const includes: string[] = []
    const excludes: string[] = []
    if (domainFilter && domainFilter.length > 0) {
      for (const raw of domainFilter) {
        const t = raw.trim()
        if (!t) continue
        if (t.startsWith('-')) excludes.push(t.slice(1).toLowerCase())
        else includes.push(t.toLowerCase())
      }
    }
    const passesDomainFilter = (url: string): boolean => {
      let host = ''
      try {
        host = new URL(url).hostname.toLowerCase()
      } catch {
        return false
      }
      if (excludes.some((d) => host.endsWith(d) || host.includes(d))) {
        return false
      }
      if (includes.length > 0) {
        return includes.some((d) => host.endsWith(d) || host.includes(d))
      }
      return true
    }

    const mediaResults = [
      ...imageResultsToMedia(imageResp, passesDomainFilter),
      ...videoResultsToMedia(videoResp, passesDomainFilter)
    ]

    const llmCtxOnly = llmCtx
    const sources: BraveLlmContextSource[] = [
      ...(llmCtxOnly?.grounding?.generic ?? [])
    ]

    const baseRank = webSources ? webSources.size : 0
    const results: WebSearchResult[] = []
    for (const src of sources) {
      if (!src.url) continue
      if (webSources && webSources.has(src.url)) continue
      if (!passesDomainFilter(src.url)) continue

      const llmMeta = llmCtxOnly?.sources?.[src.url]
      const content = (src.snippets ?? []).filter(Boolean).join('\n\n')
      if (!content) continue

      const title = src.title || llmMeta?.title || llmMeta?.hostname || src.url

      results.push({
        rank: baseRank + results.length + 1,
        link: src.url,
        title,
        snippet: content.slice(0, 300),
        content
      })
    }

    if (mediaResults.length > 0) {
      if (results.length > 0) {
        results[0] = {
          ...results[0],
          media: mediaResults
        }
      } else {
        results.push({
          rank: baseRank + 1,
          link: mediaResults[0].sourceUrl,
          title: `Media results for ${query}`,
          snippet: '',
          content: '',
          media: mediaResults
        })
      }
    }

    return results.length > 0 ? results : null
  } catch {
    return null
  }
}
