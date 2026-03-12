import { WebPDFLoader } from '@langchain/community/document_loaders/web/pdf'
import { UrlToMarkdownProvider } from '@shared/schemas/setting-schema'
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

async function loadDocumentDefault(link: string) {
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

async function loadDocumentWithJina(link: string) {
  try {
    const response = await fetch(`https://r.jina.ai/${link}`, {
      headers: { Accept: 'text/plain' }
    })

    if (!response.ok) return null

    const content = await response.text()

    return content
      ? {
          ogImage: '',
          type: 'html' as const,
          content
        }
      : null
  } catch {
    return null
  }
}

async function loadDocumentWithCloudflare(
  link: string,
  accountId: string,
  apiToken: string
) {
  try {
    const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/crawl`

    // Initiate crawl
    const initResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: link })
    })

    if (!initResponse.ok) return null

    const initData = await initResponse.json()
    if (!initData.success || !initData.result) return null

    const jobId = initData.result as string

    // Poll for results (max 30s)
    const deadline = Date.now() + 30_000
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000))

      const pollResponse = await fetch(`${baseUrl}/${jobId}?limit=1`, {
        headers: { Authorization: `Bearer ${apiToken}` }
      })

      if (!pollResponse.ok) return null

      const pollData = await pollResponse.json()
      if (!pollData.success) return null

      const job = pollData.result
      if (job?.status === 'completed' && job?.records?.length) {
        const record = job.records[0]
        const content: string = record.markdown || record.html || ''

        return content
          ? {
              ogImage: '',
              type: 'html' as const,
              content
            }
          : null
      }

      if (job?.status === 'errored') return null
    }

    return null
  } catch {
    return null
  }
}

async function loadDocument(
  link: string,
  provider?: UrlToMarkdownProvider | null,
  cloudflareAccountId?: string | null,
  cloudflareApiToken?: string | null
) {
  if (provider === 'jina') {
    return loadDocumentWithJina(link)
  }

  if (provider === 'cloudflare' && cloudflareAccountId && cloudflareApiToken) {
    return loadDocumentWithCloudflare(
      link,
      cloudflareAccountId,
      cloudflareApiToken
    )
  }

  return loadDocumentDefault(link)
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
  language,
  urlToMarkdownProvider,
  cloudflareAccountId,
  cloudflareApiToken
}: {
  query: string
  braveApiKey: string
  webSources?: Map<string, WebSearchResult>
  country?: string | null
  language?: string | null
  urlToMarkdownProvider?: UrlToMarkdownProvider | null
  cloudflareAccountId?: string | null
  cloudflareApiToken?: string | null
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
        const document = await loadDocument(
          item.url,
          urlToMarkdownProvider,
          cloudflareAccountId,
          cloudflareApiToken
        )

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
