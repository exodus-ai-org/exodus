import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { Settings } from '@shared/types/db'

import { fetchWebSearch } from '../utils/web-search-util'

const webSearchSchema = Type.Object({
  query: Type.String({ description: 'The search query.' })
})

export const webSearch = (
  setting: Settings
): AgentTool<typeof webSearchSchema> => ({
  name: 'webSearch',
  label: 'Web Search',
  description: `Search the web for up-to-date information. Results are numbered [1],[2],… — you MUST cite every factual sentence in your reply using 【N-source】 markers. Suffix a specific date to the query if needed. Today is ${new Date().toISOString()}`,
  parameters: webSearchSchema,
  execute: async (_toolCallId, { query }) => {
    if (!setting?.webSearch?.perplexityApiKey) {
      throw new Error(
        'Web Search requires a Perplexity API Key. Please add it in Settings → Web Search.'
      )
    }
    const ws = setting.webSearch
    const details = await fetchWebSearch({
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

    if (!details?.length) {
      return {
        content: [{ type: 'text' as const, text: 'No search results found.' }],
        details: []
      }
    }

    // Format results as structured text so the LLM knows each source's citation index.
    // IMPORTANT: you MUST cite every factual sentence using 【N-source】 where N is the source number below.
    const formatted =
      `IMPORTANT: cite every factual sentence with 【N-source】 where N is the source number.\n\n` +
      details
        .map((r) => `[${r.rank}] ${r.title}\nURL: ${r.link}\n${r.content}`)
        .join('\n\n---\n\n')

    return {
      content: [{ type: 'text' as const, text: formatted }],
      details
    }
  }
})
