import type { Settings } from '@shared/types/db'
import { tool } from 'ai'
import { z } from 'zod'
import { fetchAndProcessSearchResults } from '../utils/web-search-util'

export const webSearch = (settings: Settings) =>
  tool({
    description: `Search the web for up-to-date information. Suffix a specific date to the query parameter based on user's input. Today is ${new Date().toISOString()}`,
    inputSchema: z.object({
      query: z.string().min(1).max(100).describe(`The search query.`)
    }),
    execute: async ({ query }) => {
      if (!settings?.webSearch?.serperApiKey) {
        throw new Error(
          'To use Web Search, make sure to fill in the `serperApiKey` in the settings.'
        )
      }
      return fetchAndProcessSearchResults(
        query,
        settings.webSearch.serperApiKey
      )
    }
  })
