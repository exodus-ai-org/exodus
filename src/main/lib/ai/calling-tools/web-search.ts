import { Setting } from '@shared/types/db'
import { tool } from 'ai'
import { z } from 'zod'
import { fetchAndProcessSearchResults } from '../utils/web-search-util'

export const webSearch = (setting: Setting) =>
  tool({
    description: `Search the web for up-to-date information. Suffix a specific date to the query parameter based on user's input. Today is ${new Date().toISOString()}`,
    inputSchema: z.object({
      query: z.string().min(1).max(100).describe(`The search query.`)
    }),
    execute: async ({ query }) => {
      if (!setting?.webSearch?.braveApiKey) {
        throw new Error(
          'To use Web Search, make sure to fill in the `braveApiKey` in the setting.'
        )
      }
      const searchResults = fetchAndProcessSearchResults({
        query,
        braveApiKey: setting.webSearch.braveApiKey,
        country: setting.webSearch.country,
        language: setting.webSearch.language,
        urlToMarkdownProvider: setting.webSearch.urlToMarkdownProvider,
        cloudflareAccountId: setting.webSearch.cloudflareAccountId,
        cloudflareApiToken: setting.webSearch.cloudflareApiToken
      })

      return searchResults
    }
  })
