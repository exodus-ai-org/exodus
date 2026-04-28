import { WebPDFLoader } from '@langchain/community/document_loaders/web/pdf'
import { WebSearchResult } from '@shared/types/web-search'
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

/* ================= Brave Search (LLM Context + Web Search) ================= */

// Subset of the Brave Web Search response shape we care about — there are far
// more fields (videos, FAQ, infobox, etc.) but we only consume metadata for
// citation display, so we keep this narrow.
type BraveWebMeta = {
  url: string
  title?: string
  page_age?: string
  meta_url?: { hostname?: string; favicon?: string }
  profile?: { name?: string; long_name?: string }
  thumbnail?: { src?: string; original?: string }
  extra_snippets?: string[]
  description?: string
}

type BraveWebSearchResponse = {
  web?: { results?: BraveWebMeta[] }
  news?: { results?: BraveWebMeta[] }
}

// LLM Context returns a single Markdown summary plus the source list it used.
// `grounding.generic` is the per-source array we can map to our citation format.
type BraveLlmContextSource = {
  url: string
  title?: string
  snippets?: string[]
}

// With enable_source_metadata=1 the `sources` map carries publisher/favicon
// info too — used as a fallback when the parallel Web Search call doesn't
// return a particular URL.
type BraveLlmContextSourceMeta = {
  title?: string
  hostname?: string
  favicon?: string
  name?: string
  long_name?: string
  age?: string | string[]
}

type BraveLlmContextResponse = {
  grounding?: {
    generic?: BraveLlmContextSource[]
  }
  sources?: Record<string, BraveLlmContextSourceMeta>
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

async function fetchBraveWebSearch({
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
}): Promise<BraveWebSearchResponse | null> {
  const params = buildCommonParams({
    query,
    country,
    languages,
    recencyFilter,
    maxResults
  })
  // Limit to web + news result types — discussions/videos/FAQ rarely add value
  // for general grounding and just dilute the citation list.
  params.set('result_filter', 'web,news')
  // Ask for the per-result extra_snippets — without this flag results only
  // carry a single `description`, which is too thin to fall back on for
  // sources that LLM Context didn't surface.
  params.set('extra_snippets', '1')

  const res = await fetch(`${BRAVE_API_BASE}/web/search?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'x-subscription-token': apiKey
    }
  })
  if (!res.ok) return null
  return (await res.json()) as BraveWebSearchResponse
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
  // Ask the LLM Context endpoint to populate favicon + publisher names in the
  // `sources` map so we have a metadata fallback even if the parallel Web
  // Search call fails or omits a URL.
  params.set('enable_source_metadata', '1')
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

type BraveCitationMeta = {
  publisher: string
  favicon: string
  ogImage: string
  age?: string
  hostname: string
  fallbackContent: string
}

function publisherFromMeta(m: BraveWebMeta): string {
  // Prefer the human-readable publisher name; fall back to hostname.
  const long = m.profile?.long_name?.trim()
  if (long) return long
  const short = m.profile?.name?.trim()
  if (short) return short
  const host = m.meta_url?.hostname
  return host ? host.replace(/^www\./, '') : ''
}

function indexBraveMeta(
  resp: BraveWebSearchResponse | null
): Map<string, BraveCitationMeta> {
  const map = new Map<string, BraveCitationMeta>()
  if (!resp) return map
  const seen = [...(resp.web?.results ?? []), ...(resp.news?.results ?? [])]
  for (const r of seen) {
    if (!r.url || map.has(r.url)) continue
    const hostname = r.meta_url?.hostname ?? ''
    map.set(r.url, {
      publisher: publisherFromMeta(r) || hostname,
      favicon: r.meta_url?.favicon ?? '',
      ogImage: r.thumbnail?.src ?? r.thumbnail?.original ?? '',
      age: r.page_age,
      hostname,
      fallbackContent: [r.description ?? '', ...(r.extra_snippets ?? [])]
        .filter(Boolean)
        .join('\n\n')
    })
  }
  return map
}

/**
 * Search the web via the Brave Search API and return structured results.
 *
 * Two endpoints are called in parallel:
 * - **LLM Context** (`/summarizer/llm_context`) — returns curated, multi-paragraph
 *   snippets per source. Used as the canonical content the LLM grounds on.
 * - **Web Search** (`/web/search`) — returns per-result metadata (publisher
 *   long-name, favicon, og:image thumbnail). Used to dress up citation chips
 *   and hover previews. Acts as a content fallback for sources LLM Context
 *   didn't surface.
 *
 * Both calls share the same query + filters, so latency is roughly that of a
 * single call. Neither endpoint requires us to fetch and parse HTML, so there
 * is no scraping risk or per-page cost.
 */
export async function fetchWebSearch({
  query,
  braveApiKey,
  webSources,
  country,
  languages,
  maxResults,
  recencyFilter,
  domainFilter
}: {
  query: string
  braveApiKey: string
  webSources?: Map<string, WebSearchResult>
  country?: string | null
  languages?: string[] | null
  maxResults?: number | null
  recencyFilter?: string | null
  domainFilter?: string[] | null
}): Promise<WebSearchResult[] | null> {
  try {
    const [llmCtx, webMeta] = await Promise.all([
      fetchBraveLlmContext({
        query,
        apiKey: braveApiKey,
        country,
        languages,
        recencyFilter,
        maxResults
      }),
      fetchBraveWebSearch({
        query,
        apiKey: braveApiKey,
        country,
        languages,
        recencyFilter,
        maxResults
      })
    ])

    const metaByUrl = indexBraveMeta(webMeta)

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

    // Build the canonical source list. Prefer LLM Context's order (curated for
    // grounding); fall back to Web Search-only sources for any URL it missed.
    const sources: BraveLlmContextSource[] = [
      ...(llmCtx?.grounding?.generic ?? [])
    ]
    const llmUrlSet = new Set(sources.map((s) => s.url))
    for (const [url, meta] of metaByUrl) {
      if (!llmUrlSet.has(url) && meta.fallbackContent) {
        sources.push({
          url,
          title: '',
          snippets: [meta.fallbackContent]
        })
      }
    }

    const baseRank = webSources ? webSources.size : 0
    const results: WebSearchResult[] = []
    for (const src of sources) {
      if (!src.url) continue
      if (webSources && webSources.has(src.url)) continue
      if (!passesDomainFilter(src.url)) continue

      const meta = metaByUrl.get(src.url)
      const llmMeta = llmCtx?.sources?.[src.url]
      const content = (src.snippets ?? []).filter(Boolean).join('\n\n')
      if (!content) continue

      const title = src.title || llmMeta?.title || meta?.publisher || src.url
      const hostname =
        meta?.hostname ||
        llmMeta?.hostname ||
        (() => {
          try {
            return new URL(src.url).hostname.replace(/^www\./, '')
          } catch {
            return ''
          }
        })()
      const llmAge = Array.isArray(llmMeta?.age)
        ? llmMeta?.age[0]
        : llmMeta?.age

      results.push({
        rank: baseRank + results.length + 1,
        link: src.url,
        title,
        snippet: content.slice(0, 300),
        content,
        ogImage: meta?.ogImage ?? '',
        publisher:
          meta?.publisher ||
          llmMeta?.long_name ||
          llmMeta?.name ||
          hostname ||
          title,
        favicon: meta?.favicon || llmMeta?.favicon || '',
        age: meta?.age || llmAge
      })
    }

    return results.length > 0 ? results : null
  } catch {
    return null
  }
}
