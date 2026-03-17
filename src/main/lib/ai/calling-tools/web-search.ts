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
    const ws = setting.webSearch
    const details = await fetchAndProcessSearchResults({
      query,
      perplexityApiKey: ws.perplexityApiKey!,
      country: ws.country,
      languages: ws.languages,
      maxResults: ws.maxResults,
      recencyFilter: ws.recencyFilter,
      domainFilter: ws.domainFilter
        ? ws.domainFilter
            .split(',')
            .map((d) => d.trim())
            .filter(Boolean)
        : null
    })
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(details) }],
      details
    }
  }
})
