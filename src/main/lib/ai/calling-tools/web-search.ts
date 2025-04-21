import { customsearch } from '@googleapis/customsearch'
import { WebPDFLoader } from '@langchain/community/document_loaders/web/pdf'
import { Setting } from '@shared/types/db'
import {
  DocumentType,
  DocumentTypeWithoutTokenCount
} from '@shared/types/web-search'
import { tool } from 'ai'
import * as cheerio from 'cheerio'
import { encodingForModel } from 'js-tiktoken'
import TurndownService from 'turndown'
import { z } from 'zod'

const enc = encodingForModel('gpt-4o')

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

    $('style').remove()
    $('script').remove()
    $('head').remove()

    let favicon = $('link[rel="icon"], link[rel="shortcut icon"]').attr('href')
    if (!favicon) {
      const baseUrl = new URL(link).origin
      favicon = `${baseUrl}/favicon.ico`
    }
    const faviconUrl = new URL(favicon, link).href

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
    const response = await fetch(link)
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
    description: `Search the web for up-to-date information. You should suffix a specific date to the query parameter based on user's input. Today is ${new Date().toISOString()}.`,
    parameters: z.object({
      query: z.string().min(1).max(100).describe(`The search query.`)
    }),
    execute: async ({ query }) => {
      if (!setting.googleApiKey) {
        throw new Error(
          'To use Web Search, make sure to fill in the `googleApiKey` in the settings.'
        )
      }

      if (!setting.googleCseId) {
        throw new Error(
          'To use Web Search, make sure to fill in the `googleCseId` in the settings.'
        )
      }

      try {
        const result = await customsearch('v1').cse.list({
          auth: setting.googleApiKey,
          cx: setting.googleCseId,
          q: query,
          num: 10,
          hl: 'en',
          gl: 'us',
          dateRestrict: 'm1',
          sort: 'date'
        })

        const { items } = result.data
        if (!items)
          return JSON.stringify({
            success: false,
            message: 'No search results!'
          })

        const results = await Promise.allSettled(
          items
            .filter((item) => !!item.link && !!item.title)
            .map(async (item) => {
              const document = await loadDocument(item.link as string)
              return {
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

        const values: DocumentTypeWithoutTokenCount[] = results
          .filter(
            (result): result is PromiseFulfilledResult<DocumentType> =>
              result.status === 'fulfilled' &&
              // TODO: Need to determine a more precise limit value via model.
              result.value.tokenCount < 180_000
          )
          .map(
            ({ value }) =>
              ({
                favicon: value.favicon,
                type: value.type,
                link: value.link,
                title: value.title,
                snippet: value.snippet,
                content: value.content
              }) as DocumentTypeWithoutTokenCount
          )

        return JSON.stringify(values)
      } catch (e) {
        return e instanceof Error ? e.message : 'Failed to use web search.'
      }
    }
  })
