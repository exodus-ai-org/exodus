import { WebPDFLoader } from '@langchain/community/document_loaders/web/pdf'
import { Settings } from '@shared/types/db'
import { WebSearchResponse, WebSearchResult } from '@shared/types/web-search'
import { tool } from 'ai'
import * as cheerio from 'cheerio'
import { encodingForModel } from 'js-tiktoken'
import TurndownService from 'turndown'
import { z } from 'zod'

const enc = encodingForModel('o4-mini')

function getOgImageLink($: cheerio.CheerioAPI) {
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

async function loadPdf(blob: Blob) {
  try {
    const loader = new WebPDFLoader(blob, { parsedItemSeparator: '' })
    const docs = await loader.load()
    return docs.reduce((acc, val) => acc + `\n${val.pageContent}`, '')
  } catch {
    return ''
  }
}

async function loadHtml(html: string) {
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

async function loadDocument(link: string) {
  try {
    const response = await fetch(link)
    const contentType = response.headers.get('content-type')

    if (contentType?.includes('application/pdf')) {
      const blob = await response.blob()
      const pdf = await loadPdf(blob)
      if (pdf) {
        const documentData = {
          ogImage: '',
          type: 'pdf',
          content: pdf
        }
        return documentData
      }
    }

    if (contentType?.includes('text/html')) {
      const html = await response.text()
      const domInfo = await loadHtml(html)

      if (domInfo) {
        const turndownService = new TurndownService()
        const markdown = turndownService.turndown(domInfo.domStr)

        if (markdown) {
          const documentData = {
            ogImage: domInfo.ogImage,
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

export const webSearch = (settings: Settings) =>
  tool({
    description: `Search the web for up-to-date information. Suffix a specific date to the query parameter based on user's input. Today is ${new Date().toISOString()}`,
    parameters: z.object({
      query: z.string().min(1).max(100).describe(`The search query.`)
    }),
    execute: async ({ query }) => {
      if (!settings?.webSearch?.serperApiKey) {
        throw new Error(
          'To use Web Search, make sure to fill in the `serperApiKey` in the settings.'
        )
      }

      try {
        const response = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': settings.webSearch.serperApiKey,
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
            .filter((item) => !!item.link && !!item.title)
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

        const webSearchResults: WebSearchResult[] = results
          .filter(
            (result): result is PromiseFulfilledResult<WebSearchResult> =>
              result.status === 'fulfilled' &&
              !!result.value.content &&
              enc.encode(result.value.content).length < 180_000
          )
          .map((item, i) => ({ ...item.value, rank: i + 1 }))

        return webSearchResults
      } catch {
        return null
      }
    }
  })
