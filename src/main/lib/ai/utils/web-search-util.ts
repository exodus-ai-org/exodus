import { WebPDFLoader } from '@langchain/community/document_loaders/web/pdf'
import { WebSearchResponse, WebSearchResult } from '@shared/types/web-search'
import * as cheerio from 'cheerio'
import { encodingForModel } from 'js-tiktoken'
import TurndownService from 'turndown'

const enc = encodingForModel('o4-mini')

export function getOgImageLink($: cheerio.CheerioAPI) {
  try {
    const ogImage =
      $('meta[property="og:image"]').attr('content') ??
      $('meta[name="og:image"]').attr('content') ??
      $('meta[name="twitter:image"]').attr('content')
    return ogImage
  } catch {
    return ''
  }
}

export async function loadPdf(blob: Blob) {
  try {
    const loader = new WebPDFLoader(blob, { parsedItemSeparator: '' })
    const docs = await loader.load()
    return docs.reduce((acc, val) => acc + `\n${val.pageContent}`, '')
  } catch {
    return ''
  }
}

export async function loadHtml(html: string) {
  try {
    const $ = cheerio.load(html)
    const headImageUrl = getOgImageLink($)
    $('style').remove()
    $('script').remove()
    $('head').remove()
    return {
      ogImage: headImageUrl,
      domStr: $.html()
    }
  } catch {
    return ''
  }
}

export async function loadDocument(link: string) {
  try {
    const response = await fetch(link)
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/pdf')) {
      const blob = await response.blob()
      const pdf = await loadPdf(blob)
      if (pdf) {
        return {
          ogImage: '',
          type: 'pdf',
          content: pdf
        }
      }
    }
    if (contentType?.includes('text/html')) {
      const html = await response.text()
      const domInfo = await loadHtml(html)
      if (domInfo) {
        const turndownService = new TurndownService()
        const markdown = turndownService.turndown(domInfo.domStr)
        if (markdown) {
          return {
            ogImage: domInfo.ogImage,
            type: 'html',
            content: markdown
          }
        }
      }
    }
    return null
  } catch {
    return null
  }
}

export async function fetchAndProcessSearchResults(
  query: string,
  serperApiKey: string,
  webSources?: Map<string, WebSearchResult> // Use for deep research
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
          (item) =>
            !!item.link &&
            !!item.title &&
            (!webSources || !webSources.has(item.link))
        )
        .map(async (item) => {
          const document = await loadDocument(item.link as string)
          return {
            link: item.link as string,
            title: item.title as string,
            snippet: item.snippet ?? '',
            ogImage: document?.ogImage,
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
      .map((item, i) => ({
        ...item.value,
        rank: webSources ? webSources.size + i + 1 : i + 1
      }))

    return searchResults
  } catch {
    return null
  }
}

export { enc }
