import { WebPDFLoader } from '@langchain/community/document_loaders/web/pdf'
import {
  WebSearchResponse,
  WebSearchResult,
  WebSearchSourceType
} from '@shared/types/web-search'
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

async function searchBySerper(
  query: string,
  serperApiKey: string,
  sourceType?: WebSearchSourceType
) {
  try {
    const response = await fetch(
      `https://google.serper.dev/search/${sourceType ?? 'search'}`,
      {
        method: 'POST',
        headers: {
          'X-API-KEY': serperApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: query })
      }
    )

    const raw = await response.text()
    return raw ? (JSON.parse(raw) as WebSearchResponse) : null
  } catch {
    return null
  }
}

/* ================= Main ================= */

export async function fetchAndProcessSearchResults({
  query,
  serperApiKey,
  webSources,
  sourceType
}: {
  query: string
  serperApiKey: string
  webSources?: Map<string, WebSearchResult>
  sourceType?: WebSearchSourceType
}) {
  try {
    const data = await searchBySerper(query, serperApiKey, sourceType)
    const organic = data?.organic
    if (!organic?.length) return null

    const tasks = organic
      .filter(
        (item) =>
          !!item.link &&
          !!item.title &&
          (!webSources || !webSources.has(item.link))
      )
      .map(async (item) => {
        const document = await loadDocument(item.link!)

        return {
          link: item.link!,
          title: item.title!,
          snippet: item.snippet ?? '',
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
