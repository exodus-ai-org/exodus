import { WebPDFLoader } from '@langchain/community/document_loaders/web/pdf'
import { WebSearchResponse, WebSearchResult } from '@shared/types/web-search'
import * as cheerio from 'cheerio'
import { encodingForModel } from 'js-tiktoken'
import TurndownService from 'turndown'

const enc = encodingForModel('o4-mini')

function getFaviconLink(link: string, $: cheerio.CheerioAPI) {
  try {
    let favicon =
      $('link[rel="apple-touch-icon"]').attr('href') ??
      $('link[rel="apple-touch-icon-precomposed"]').attr('href') ??
      $('link[rel="icon"]').attr('href') ??
      $('link[rel="shortcut icon"]').attr('href') ??
      $('link[rel="alternate icon"]').attr('href') ??
      $('link[rel="mask-icon"]').attr('href')

    if (!favicon) {
      const baseUrl = new URL(link).origin
      favicon = `${baseUrl}/favicon.ico`
    }

    return new URL(favicon, link).href
  } catch {
    return ''
  }
}

function getHeadImageLink($: cheerio.CheerioAPI) {
  try {
    const headImage =
      $('meta[property="og:image"]').attr('content') ??
      $('meta[name="og:image"]').attr('content') ??
      $('meta[name="twitter:image"]').attr('content')

    return headImage
  } catch {
    return ''
  }
}

async function loadPdf(blob: Blob) {
  try {
    const loader = new WebPDFLoader(blob, { parsedItemSeparator: '' })
    const docs = await loader.load()
    return docs.reduce((acc, val) => acc + `\n${val.pageContent}`, '')
  } catch {
    return ''
  }
}

async function loadHtml(link: string, html: string) {
  try {
    const $ = cheerio.load(html)
    const faviconUrl = getFaviconLink(link, $)
    const headImageUrl = getHeadImageLink($)

    $('style').remove()
    $('script').remove()
    $('head').remove()

    return {
      favicon: faviconUrl,
      headImage: headImageUrl,
      domStr: $.html()
    }
  } catch {
    return ''
  }
}

async function loadDocument(link: string) {
  try {
    const response = await fetch(link)
    const contentType = response.headers.get('content-type')

    if (contentType?.includes('application/pdf')) {
      const blob = await response.blob()
      const pdf = await loadPdf(blob)
      if (pdf) {
        const documentData = {
          favicon: '',
          headImage: '',
          type: 'pdf',
          content: pdf
        }
        return documentData
      }
    }

    if (contentType?.includes('text/html')) {
      const html = await response.text()
      const domInfo = await loadHtml(link, html)

      if (domInfo) {
        const turndownService = new TurndownService()
        const markdown = turndownService.turndown(domInfo.domStr)

        if (markdown) {
          const documentData = {
            favicon: domInfo.favicon,
            headImage: domInfo.headImage,
            type: 'html',
            content: markdown
          }
          return documentData
        }
      }
    }

    return null
  } catch {
    return null
  }
}

export async function webSearch(
  {
    query,
    webSources
  }: {
    query: string
    webSources: Map<string, WebSearchResult>
  },
  {
    serperApiKey
  }: {
    serperApiKey: string
  }
) {
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query
      })
    })
    const result = await response.text()
    if (!result) {
      return null
    }

    const { organic } = JSON.parse(result) as WebSearchResponse
    if (!organic) {
      return null
    }

    const results = await Promise.allSettled(
      organic
        .filter(
          (item) => !!item.link && !!item.title && !webSources.has(item.link)
        )
        .map(async (item) => {
          const document = await loadDocument(item.link as string)
          return {
            link: item.link as string,
            title: item.title as string,
            snippet: item.snippet ?? '',
            favicon: document?.favicon,
            headImage: document?.headImage,
            type: document?.type,
            content: document?.content
          }
        })
    )

    const searchResults = results
      .filter(
        (result): result is PromiseFulfilledResult<WebSearchResult> =>
          result.status === 'fulfilled' &&
          !!result.value.content &&
          enc.encode(result.value.content).length < 180_000
      )
      .map((item, i) => ({ ...item.value, rank: webSources.size + i + 1 }))

    return searchResults
  } catch {
    return null
  }
}
