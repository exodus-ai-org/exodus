import { WebPDFLoader } from '@langchain/community/document_loaders/web/pdf'
import { Setting } from '@shared/types/db'
import {
  WebSearchResponse,
  WebSearchResult,
  WebSearchResultWithoutTokenCount
} from '@shared/types/web-search'
import { tool } from 'ai'
import * as cheerio from 'cheerio'
import { encodingForModel } from 'js-tiktoken'
import TurndownService from 'turndown'
import { z } from 'zod'

const enc = encodingForModel('gpt-4o')

function getFaviconLink(link: string, $: cheerio.CheerioAPI) {
  let favicon =
    $('link[rel="icon"]').attr('href') ??
    $('link[rel="shortcut icon"]').attr('href') ??
    $('link[rel="alternate icon"]').attr('href') ??
    $('link[rel="mask-icon"]').attr('href')

  if (!favicon) {
    const baseUrl = new URL(link).origin
    favicon = `${baseUrl}/favicon.ico`
  }

  return new URL(favicon, link).href
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

async function loadDom(link: string, html: string) {
  try {
    const $ = cheerio.load(html)
    const faviconUrl = getFaviconLink(link, $)

    $('style').remove()
    $('script').remove()
    $('head').remove()

    return {
      favicon: faviconUrl,
      domStr: $.html()
    }
  } catch {
    return ''
  }
}

async function loadDocument(link: string) {
  try {
    const response = await fetch(link, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        Connection: 'keep-alive'
      }
    })
    const contentType = response.headers.get('content-type')

    if (contentType?.includes('application/pdf')) {
      const blob = await response.blob()
      const pdf = await loadPdf(blob)
      if (pdf) {
        const documentData = {
          favicon: '',
          type: 'html',
          content: pdf,
          tokenCount: enc.encode(pdf).length
        }
        return documentData
      }
    }

    if (contentType?.includes('text/html')) {
      const html = await response.text()
      const domInfo = await loadDom(link, html)

      if (domInfo) {
        const turndownService = new TurndownService()
        const markdown = turndownService.turndown(domInfo.domStr)

        if (markdown) {
          const documentData = {
            favicon: domInfo.favicon,
            type: 'html',
            content: markdown,
            tokenCount: enc.encode(markdown).length
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

export const webSearch = (setting: Setting) =>
  tool({
    description: `Search the web for up-to-date information. Suffix a specific date to the query parameter based on user's input. Today is ${new Date().toISOString()}`,
    parameters: z.object({
      query: z.string().min(1).max(100).describe(`The search query.`)
    }),
    execute: async ({ query }) => {
      if (!setting.serperApiKey) {
        throw new Error(
          'To use Web Search, make sure to fill in the `serperApiKey` in the settings.'
        )
      }

      try {
        const response = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': setting.serperApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            q: query
          })
        })
        const result = await response.text()

        if (!result) {
          return JSON.stringify({
            success: false,
            message: 'No search results found!'
          })
        }

        const { organic } = JSON.parse(result) as WebSearchResponse

        if (!organic) {
          return JSON.stringify({
            success: false,
            message: 'No search results found!'
          })
        }

        const results = await Promise.allSettled(
          organic
            .filter((item) => !!item.link && !!item.title)
            .map(async (item) => {
              const document = await loadDocument(item.link as string)
              return {
                rank: item.position,
                link: item.link as string,
                title: item.title as string,
                snippet: item.snippet ?? '',
                favicon: document?.favicon,
                type: document?.type,
                content: document?.content,
                tokenCount: document?.tokenCount ?? 0
              }
            })
        )

        const values: WebSearchResultWithoutTokenCount[] = results
          .filter(
            (result): result is PromiseFulfilledResult<WebSearchResult> =>
              result.status === 'fulfilled' &&
              // TODO: Need to determine a more precise quote based on the specific model.
              result.value.tokenCount < 180_000
          )
          .map(
            ({ value }) =>
              ({
                rank: value.rank,
                favicon: value.favicon,
                type: value.type,
                link: value.link,
                title: value.title,
                snippet: value.snippet,
                content: value.content
              }) as WebSearchResultWithoutTokenCount
          )

        return JSON.stringify(values)
      } catch (e) {
        return e instanceof Error
          ? e.message
          : 'Failed to retrieve data from web search.'
      }
    }
  })
