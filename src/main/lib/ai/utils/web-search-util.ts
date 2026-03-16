import { WebPDFLoader } from '@langchain/community/document_loaders/web/pdf'
import { UrlToMarkdownProvider } from '@shared/schemas/setting-schema'
import {
  PerplexitySearchResponse,
  WebSearchResult
} from '@shared/types/web-search'
import * as cheerio from 'cheerio'
import TurndownService from 'turndown'

/* ================= Constants ================= */

const TURNDOWN_OPTIONS = {
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
} as const

const PERPLEXITY_SEARCH_URL = 'https://api.perplexity.ai/search'

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

/**
 * Load a URL as markdown, used by the webFetch tool.
 * Defaults to Jina Reader; falls back to built-in if provider is 'builtin'.
 */
export async function loadDocument(
  link: string,
  provider?: UrlToMarkdownProvider | null
): Promise<{ ogImage: string; type: 'pdf' | 'html'; content: string } | null> {
  if (provider === 'builtin') {
    return loadDocumentBuiltin(link)
  }
  // Default: jina
  return loadDocumentWithJina(link)
}

/* ================= Perplexity Search ================= */

async function searchByPerplexity(
  query: string,
  apiKey: string,
  country?: string | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _language?: string | null
): Promise<PerplexitySearchResponse | null> {
  try {
    const body: Record<string, unknown> = {
      query,
      max_results: 10,
      max_tokens_per_page: 2000
    }
    if (country) body.country = country

    const response = await fetch(PERPLEXITY_SEARCH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) return null

    return (await response.json()) as PerplexitySearchResponse
  } catch {
    return null
  }
}

/* ================= Main Export ================= */

/**
 * Search the web via Perplexity and return structured results.
 * Perplexity returns snippets with extracted page content — no separate URL fetching needed.
 */
export async function fetchAndProcessSearchResults({
  query,
  perplexityApiKey,
  webSources,
  country,
  language
}: {
  query: string
  perplexityApiKey: string
  webSources?: Map<string, WebSearchResult>
  country?: string | null
  language?: string | null
}): Promise<WebSearchResult[] | null> {
  try {
    const data = await searchByPerplexity(
      query,
      perplexityApiKey,
      country,
      language
    )
    const results = data?.results
    if (!results?.length) return null

    const filtered = results.filter(
      (r) => !!r.url && !!r.title && (!webSources || !webSources.has(r.url))
    )

    return filtered.map((r, i) => ({
      rank: webSources ? webSources.size + i + 1 : i + 1,
      link: r.url,
      title: r.title,
      snippet: r.snippet.slice(0, 300),
      content: r.snippet,
      type: 'html' as const,
      ogImage: ''
    }))
  } catch {
    return null
  }
}
