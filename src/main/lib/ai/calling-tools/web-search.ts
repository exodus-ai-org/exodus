import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { Setting } from '@shared/types/db'
import { fetchAndProcessSearchResults } from '../utils/web-search-util'

const webSearchSchema = Type.Object({
  query: Type.String({ description: 'The search query.' })
})

export const webSearch = (
  setting: Setting
): AgentTool<typeof webSearchSchema> => ({
  name: 'webSearch',
  label: 'Web Search',
  description: `Search the web for up-to-date information. Suffix a specific date to the query parameter based on user's input. Today is ${new Date().toISOString()}`,
  parameters: webSearchSchema,
  execute: async (_toolCallId, { query }) => {
    if (!setting?.webSearch?.perplexityApiKey) {
      throw new Error(
        'To use Web Search, make sure to fill in the `perplexityApiKey` in the settings.'
      )
    }
    const details = await fetchAndProcessSearchResults({
      query,
      perplexityApiKey: setting.webSearch.perplexityApiKey,
      country: setting.webSearch.country,
      language: setting.webSearch.language
    })
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(details) }],
      details
    }
  }
})
