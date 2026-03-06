import { WebPDFLoader } from '@langchain/community/document_loaders/web/pdf'
import { BraveSearchResponse, WebSearchResult } from '@shared/types/web-search'
import * as cheerio from 'cheerio'
import { encodingForModel } from 'js-tiktoken'
import TurndownService from 'turndown'

/* ================= Constants ================= */

const enc = encodingForModel('o4-mini')

const TURNDOWN_OPTIONS = {
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
} as const

/* ================= Utils ================= */

function getOgImageLink($: cheerio.CheerioAPI) {
  return (
    $('meta[property="og:image"]').attr('content') ??
    $('meta[name="og:image"]').attr('content') ??
    $('meta[name="twitter:image"]').attr('content') ??
    ''
  )
}

/* ================= Loaders ================= */

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

/* ================= Document Loader ================= */

async function loadDocument(link: string) {
  try {
    const response = await fetch(link)
    const contentType = response.headers.get('content-type') ?? ''

    // --- PDF ---
    if (contentType.includes('application/pdf')) {
      const blob = await response.blob()
      const pdf = await loadPdf(blob)

      return pdf
        ? {
            ogImage: '',
            type: 'pdf' as const,
            content: pdf
          }
        : null
    }

    // --- HTML ---
    if (contentType.includes('text/html')) {
      const html = await response.text()
      const dom = extractHtmlBody(html)

      if (!dom?.html) return null

      const markdown = htmlToMarkdown(dom.html)

      return markdown
        ? {
            ogImage: dom.ogImage,
            type: 'html' as const,
            content: markdown
          }
        : null
    }

    return null
  } catch {
    return null
  }
}

/* ================= Search ================= */

async function searchByBrave(
  query: string,
  braveApiKey: string,
  country?: string | null,
  language?: string | null
) {
  try {
    const params = new URLSearchParams({ q: query, count: '10' })
    if (country) params.set('country', country)
    if (language) params.set('search_lang', language)

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?${params}`,
      {
        headers: {
          'X-Subscription-Token': braveApiKey,
          Accept: 'application/json'
        }
      }
    )

    const raw = await response.text()
    return raw ? (JSON.parse(raw) as BraveSearchResponse) : null
  } catch {
    return null
  }
}

/* ================= Main ================= */

export async function fetchAndProcessSearchResults({
  query,
  braveApiKey,
  webSources,
  country,
  language
}: {
  query: string
  braveApiKey: string
  webSources?: Map<string, WebSearchResult>
  country?: string | null
  language?: string | null
}) {
  try {
    const data = await searchByBrave(query, braveApiKey, country, language)
    const results = data?.web?.results
    if (!results?.length) return null

    const tasks = results
      .filter(
        (item) =>
          !!item.url &&
          !!item.title &&
          (!webSources || !webSources.has(item.url))
      )
      .map(async (item) => {
        const document = await loadDocument(item.url)

        return {
          link: item.url,
          title: item.title,
          snippet: item.description ?? item.extra_snippets?.[0] ?? '',
          ogImage: document?.ogImage ?? '',
          type: document?.type,
          content: document?.content
        }
      })

    const settled = await Promise.allSettled(tasks)

    const finalResults = settled
      .filter(
        (r): r is PromiseFulfilledResult<WebSearchResult> =>
          r.status === 'fulfilled' &&
          !!r.value.content &&
          enc.encode(r.value.content).length < 180_000
      )
      .map((r, i) => ({
        ...r.value,
        rank: webSources ? webSources.size + i + 1 : i + 1
      }))

    return finalResults
  } catch {
    return null
  }
}

export { enc }
