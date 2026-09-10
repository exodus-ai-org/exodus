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
export async function loadDocumentBuiltin(link: string, signal?: AbortSignal) {
  try {
    const response = await fetch(link, { signal })
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
  link: string,
  signal?: AbortSignal
): Promise<{ ogImage: string; type: 'pdf' | 'html'; content: string } | null> {
  return (
    (await loadDocumentWithJina(link, signal)) ??
    (await loadDocumentBuiltin(link, signal))
  )
}

/** Jina Reader loader */
export async function loadDocumentWithJina(link: string, signal?: AbortSignal) {
  try {
    const response = await fetch(`https://r.jina.ai/${link}`, {
      headers: { Accept: 'text/plain' },
      signal
    })

    if (!response.ok) return null

    const content = await response.text()
    return content ? { ogImage: '', type: 'html' as const, content } : null
  } catch {
    return null
  }
}

/* ================= Brave Search ================= */

/**
 * `fetch` for the Brave API: always asks for gzip, and retries once on a 429
 * after a short pause (the free tier is 1 req/s, so a fan of parallel calls
 * trips it easily). Returns `null` on any non-2xx so callers degrade rather
 * than throw.
 */
async function braveFetch(
  url: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<Response | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'x-subscription-token': apiKey
      },
      signal
    })
    if (res.ok) return res
    if (res.status === 429 && attempt === 0) {
      await new Promise((r) => setTimeout(r, 1200))
      continue
    }
    return null
  }
  return null
}

/** Run `fn` over `items` with at most `limit` in flight; preserves order. */
async function runLimited<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  )
  return results
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
  site_name?: string
  favicon?: string
  age?: string[]
  thumbnail?: { src?: string; original?: string }
  snippet?: string
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
  // Nested metadata Brave attaches to video results — the flat `duration`
  // above is legacy; `video.*` is where creator / views / publisher live.
  video?: {
    duration?: string
    views?: number
    creator?: string
    publisher?: string
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
  maxResults,
  threshold,
  signal
}: {
  query: string
  apiKey: string
  country?: string | null
  languages?: string[] | null
  recencyFilter?: string | null
  maxResults?: number | null
  threshold?: 'broad' | 'strict'
  signal?: AbortSignal
}): Promise<BraveLlmContextResponse | null> {
  const params = buildCommonParams({
    query,
    country,
    languages,
    recencyFilter,
    maxResults
  })
  // Consider a wide candidate pool (llm/context allows up to 50, vs the shared
  // helper's 20 default) so the relevance ranker has more to draw from.
  const urls = Math.min(Math.max(maxResults ?? 20, 20), 50)
  params.set('count', String(urls))
  params.set('maximum_number_of_urls', String(urls))
  // Total token budget defaults to 8192 — with per-URL also at 8192 the first
  // source can eat the whole budget and the rest come back empty. Raise the
  // total so several sources carry real depth.
  params.set('maximum_number_of_tokens', '16384')
  params.set('maximum_number_of_tokens_per_url', '8192')
  // Enrich each source with site metadata (favicon, site_name, thumbnail, age).
  params.set('enable_source_metadata', 'true')
  // Our queries are model-authored with correct spelling; Brave's spellchecker
  // otherwise mangles identifiers ("reqwest" -> "request", "axum" -> "album").
  params.set('spellcheck', 'false')
  // Default (unset) resolves to `lenient` — max recall. `strict` is for a
  // deliberate precision follow-up when the first pass was too noisy.
  if (threshold === 'strict') params.set('context_threshold_mode', 'strict')

  const res = await braveFetch(
    `${BRAVE_API_BASE}/llm/context?${params.toString()}`,
    apiKey,
    signal
  )
  if (!res) return null
  return (await res.json()) as BraveLlmContextResponse
}

type BraveWebPageResult = {
  title?: string
  url?: string
  description?: string
  age?: string
  extra_snippets?: string[]
  profile?: { name?: string; long_name?: string }
  meta_url?: { hostname?: string; favicon?: string }
  thumbnail?: { src?: string; original?: string }
}

type BraveDiscussionResult = {
  title?: string
  url?: string
  description?: string
  age?: string
  data?: {
    forum_name?: string
    num_answers?: number
    question?: string
    top_comment?: string
  }
}

type BraveWebSearchResponse = {
  web?: { results?: BraveWebPageResult[] }
  news?: { results?: BraveWebPageResult[] }
  discussions?: { results?: BraveDiscussionResult[] }
}

/**
 * The breadth pass: `web/search` returns a wider, differently-ranked result
 * set — plus forum threads and news clusters — that the grounding endpoint's
 * relevance threshold drops. Snippet-depth only; the agent `webFetch`es any
 * of these it wants in full.
 */
async function fetchBraveWebSearch({
  query,
  apiKey,
  country,
  languages,
  recencyFilter,
  signal
}: {
  query: string
  apiKey: string
  country?: string | null
  languages?: string[] | null
  recencyFilter?: string | null
  signal?: AbortSignal
}): Promise<BraveWebSearchResponse | null> {
  const params = buildCommonParams({
    query,
    country,
    languages,
    recencyFilter,
    maxResults: 20
  })
  params.set('result_filter', 'web,news,discussions')
  params.set('extra_snippets', 'true')
  params.set('spellcheck', 'false')

  const res = await braveFetch(
    `${BRAVE_API_BASE}/web/search?${params.toString()}`,
    apiKey,
    signal
  )
  if (!res) return null
  return (await res.json()) as BraveWebSearchResponse
}

type FlatWebSource = {
  url: string
  title: string
  content: string
  age?: string
  siteName?: string
  hostname?: string
  favicon?: string
  thumbnail?: string
}

/** Flatten web + news + discussion clusters into a single deduped list. */
export function webResultsToSources(
  resp: BraveWebSearchResponse | null
): FlatWebSource[] {
  if (!resp) return []
  const out: FlatWebSource[] = []
  const seen = new Set<string>()

  const pushPage = (r: BraveWebPageResult) => {
    if (!r.url || !r.title || seen.has(r.url)) return
    const content = [r.description, ...(r.extra_snippets ?? [])]
      .filter(Boolean)
      .join('\n\n')
    if (!content) return
    seen.add(r.url)
    out.push({
      url: r.url,
      title: r.title,
      content,
      age: r.age,
      siteName: r.profile?.name ?? r.profile?.long_name,
      hostname: r.meta_url?.hostname,
      favicon: r.meta_url?.favicon,
      thumbnail: r.thumbnail?.src ?? r.thumbnail?.original
    })
  }

  for (const r of resp.web?.results ?? []) pushPage(r)
  for (const r of resp.news?.results ?? []) pushPage(r)
  for (const r of resp.discussions?.results ?? []) {
    if (!r.url || !r.title || seen.has(r.url)) continue
    const d = r.data
    const head = d?.forum_name
      ? `[Forum: ${d.forum_name}${d.num_answers ? `, ${d.num_answers} answers` : ''}]`
      : '[Discussion]'
    const content = [head, d?.question, d?.top_comment, r.description]
      .filter(Boolean)
      .join('\n\n')
    seen.add(r.url)
    out.push({ url: r.url, title: r.title, content, age: r.age })
  }

  return out
}

async function fetchBraveImages({
  query,
  apiKey,
  country,
  languages,
  maxResults,
  signal
}: {
  query: string
  apiKey: string
  country?: string | null
  languages?: string[] | null
  maxResults?: number | null
  signal?: AbortSignal
}): Promise<BraveImageSearchResponse | null> {
  const params = buildCommonParams({
    query,
    country,
    languages,
    maxResults: Math.min(maxResults ?? 6, 8)
  })
  params.set('safesearch', 'strict')

  const res = await braveFetch(
    `${BRAVE_API_BASE}/images/search?${params.toString()}`,
    apiKey,
    signal
  )
  if (!res) return null
  return (await res.json()) as BraveImageSearchResponse
}

async function fetchBraveVideos({
  query,
  apiKey,
  country,
  languages,
  recencyFilter,
  maxResults,
  signal
}: {
  query: string
  apiKey: string
  country?: string | null
  languages?: string[] | null
  recencyFilter?: string | null
  maxResults?: number | null
  signal?: AbortSignal
}): Promise<BraveVideoSearchResponse | null> {
  const params = buildCommonParams({
    query,
    country,
    languages,
    recencyFilter,
    maxResults: Math.min(maxResults ?? 4, 6)
  })
  params.set('safesearch', 'moderate')

  const res = await braveFetch(
    `${BRAVE_API_BASE}/videos/search?${params.toString()}`,
    apiKey,
    signal
  )
  if (!res) return null
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
      duration: r.video?.duration || r.duration,
      age: r.age,
      creator: r.video?.creator,
      views: r.video?.views,
      publisher: r.video?.publisher
    })
  }

  return media
}

/**
 * Pick a human freshness label from Brave's `age` array, e.g.
 * `["Thursday, June 18, 2026", "2026-06-18", "5 days ago"]` → "5 days ago".
 * Prefers a relative phrase; falls back to the ISO date; else the last/first
 * entry; `undefined` when absent.
 */
export function pickAgeLabel(age?: string[]): string | undefined {
  if (!age || age.length === 0) return undefined
  const relative = age.find((a) => /\bago\b|^today$|^yesterday$/i.test(a))
  if (relative) return relative
  const iso = age.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a))
  return iso ?? age[age.length - 1] ?? age[0]
}

/**
 * Search the web via the Brave Search API and return structured results.
 *
 * `llm/context` is the primary layer — the source list and the extracted
 * content the model grounds on. With `deep`, a parallel `web/search` breadth
 * pass is merged in behind it (forums, news clusters, URLs the grounding
 * threshold dropped) as snippet-only secondary sources.
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
  domainFilter,
  deep = false,
  threshold,
  expandedQueries,
  signal
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
  deep?: boolean
  threshold?: 'broad' | 'strict'
  /** Fan-out reformulations searched alongside `query` and merged. */
  expandedQueries?: string[] | null
  signal?: AbortSignal
}): Promise<WebSearchResult[] | null> {
  try {
    const includeImages = media === 'image' || media === 'all'
    const includeVideos = media === 'video' || media === 'all'
    const queries = [query, ...(expandedQueries ?? [])].slice(0, 3)

    // Text search fans out across the query variants; media only ever runs on
    // the primary query. Cap 3 concurrent Brave calls (free tier is 1 req/s;
    // braveFetch retries the 429s).
    const [perQuery, imageResp, videoResp] = await Promise.all([
      runLimited(queries, 3, async (q) => {
        const [ctx, web] = await Promise.all([
          fetchBraveLlmContext({
            query: q,
            apiKey: braveApiKey,
            country,
            languages,
            recencyFilter,
            maxResults,
            threshold,
            signal
          }),
          deep
            ? fetchBraveWebSearch({
                query: q,
                apiKey: braveApiKey,
                country,
                languages,
                recencyFilter,
                signal
              })
            : Promise.resolve(null)
        ])
        return { ctx, web }
      }),
      includeImages
        ? fetchBraveImages({
            query,
            apiKey: braveApiKey,
            country,
            languages,
            signal
          })
        : Promise.resolve(null),
      includeVideos
        ? fetchBraveVideos({
            query,
            apiKey: braveApiKey,
            country,
            languages,
            recencyFilter,
            signal
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

    const baseRank = webSources ? webSources.size : 0
    const alreadyHave = (url: string) =>
      (webSources && webSources.has(url)) || !passesDomainFilter(url)

    // Merge grounded sources across every query variant. A URL surfaced by
    // more than one variant ranks higher; ties keep first-seen order.
    type Grounded = {
      title?: string
      snippets: string[]
      meta?: BraveLlmContextSourceMeta
      hits: number
      order: number
    }
    const grounded = new Map<string, Grounded>()
    let order = 0
    for (const { ctx } of perQuery) {
      for (const g of ctx?.grounding?.generic ?? []) {
        if (!g.url || alreadyHave(g.url)) continue
        const fresh = (g.snippets ?? []).filter(Boolean)
        const cur = grounded.get(g.url)
        if (cur) {
          cur.hits++
          for (const s of fresh)
            if (!cur.snippets.includes(s)) cur.snippets.push(s)
        } else {
          grounded.set(g.url, {
            title: g.title,
            snippets: [...fresh],
            meta: ctx?.sources?.[g.url],
            hits: 1,
            order: order++
          })
        }
      }
    }

    const results: WebSearchResult[] = []
    const ranked = [...grounded.entries()].sort(
      (a, b) => b[1].hits - a[1].hits || a[1].order - b[1].order
    )
    for (const [url, g] of ranked) {
      const content = g.snippets.join('\n\n')
      if (!content) continue
      results.push({
        rank: baseRank + results.length + 1,
        link: url,
        title: g.title || g.meta?.title || g.meta?.hostname || url,
        snippet: content.slice(0, 300),
        content,
        siteName: g.meta?.site_name,
        hostname: g.meta?.hostname,
        favicon: g.meta?.favicon,
        thumbnail: g.meta?.thumbnail?.src ?? g.meta?.thumbnail?.original,
        age: pickAgeLabel(g.meta?.age)
      })
    }

    // Breadth pass: web/search URLs (across all variants) the grounding layer
    // didn't cover, appended as snippet-only sources.
    const seen = new Set<string>([
      ...results.map((r) => r.link),
      ...(webSources ? [...webSources.keys()] : [])
    ])
    const extras: FlatWebSource[] = []
    for (const { web } of perQuery) {
      for (const s of webResultsToSources(web)) {
        if (seen.has(s.url) || !passesDomainFilter(s.url)) continue
        seen.add(s.url)
        extras.push(s)
        if (extras.length >= 15) break
      }
      if (extras.length >= 15) break
    }
    for (const s of extras) {
      results.push({
        rank: baseRank + results.length + 1,
        link: s.url,
        title: s.title,
        snippet: s.content.slice(0, 300),
        content: s.content,
        siteName: s.siteName,
        hostname: s.hostname,
        favicon: s.favicon,
        thumbnail: s.thumbnail,
        age: s.age
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
