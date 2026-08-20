import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { Settings } from '@shared/types/db'
import type { WebSearchResult } from '@shared/types/web-search'

import { fetchWebSearch } from '../utils/web-search-util'

const webSearchSchema = Type.Object({
  query: Type.String({ description: 'The search query.' }),
  media: Type.Optional(
    Type.Union(
      [
        Type.Literal('images'),
        Type.Literal('videos'),
        Type.Literal('all'),
        Type.Literal('none')
      ],
      {
        description:
          'Optional visual media search. Use "images" or "all" when building visual artifacts, comparisons, product/place explainers, or any answer that benefits from photos. Use "videos" or "all" for tutorials, demonstrations, or video-rich topics. Default: "none".'
      }
    )
  )
})

export const webSearch = (
  setting: Settings
): AgentTool<typeof webSearchSchema> => {
  const webSources = new Map<string, WebSearchResult>()
  let searchQueue = Promise.resolve()

  return {
    name: 'webSearch',
    label: 'Web Search',
    description: `Search the web for up-to-date information. Results are numbered [1],[2],… — you MUST cite every factual sentence in your reply using 【N-source】 markers. Set media="images", "videos", or "all" when the user asks for a visual artifact, visual comparison, product/place explanation, tutorial, or any answer that would be better with media. Suffix a specific date to the query if needed. Today is ${new Date().toISOString()}`,
    parameters: webSearchSchema,
    execute: async (_toolCallId, { query, media }, signal) => {
      const search = async () => {
        if (signal?.aborted) throw new Error('Aborted')
        if (!setting?.webSearch?.braveApiKey) {
          throw new Error(
            'Web Search requires a Brave Search API Key. Please add it in Settings → Web Search.'
          )
        }
        const ws = setting.webSearch
        const details = await fetchWebSearch({
          query,
          braveApiKey: ws.braveApiKey!,
          webSources,
          media:
            media === 'images' ? 'image' : media === 'videos' ? 'video' : media,
          country: ws.country,
          languages: ws.languages,
          maxResults: ws.maxResults,
          recencyFilter: ws.recencyFilter,
          domainFilter: ws.domainFilter
            ? ws.domainFilter
                .split(',')
                .map((d) => d.trim())
                .filter(Boolean)
            : null,
          signal
        })

        if (!details?.length) {
          return {
            content: [
              { type: 'text' as const, text: 'No search results found.' }
            ],
            details: []
          }
        }

        for (const result of details) {
          webSources.set(result.link, result)
        }

        // Format results as structured text so the LLM knows each source's citation index.
        // IMPORTANT: you MUST cite every factual sentence using 【N-source】 where N is the source number below.
        const formatted =
          `IMPORTANT: cite every factual sentence with 【N-source】 where N is the source number.\n\n` +
          details
            .map((r) => {
              const text = `[${r.rank}] ${r.title}\nURL: ${r.link}\n${r.content}`
              if (!r.media || r.media.length === 0) return text
              const mediaLines = r.media.map((m, i) => {
                const attrs = [
                  m.thumbnailUrl ? `thumbnail: ${m.thumbnailUrl}` : '',
                  m.source ? `source: ${m.source}` : '',
                  m.duration ? `duration: ${m.duration}` : '',
                  m.width && m.height ? `size: ${m.width}x${m.height}` : ''
                ]
                  .filter(Boolean)
                  .join('\n  ')
                return `${i + 1}. ${m.kind.toUpperCase()}: ${m.title}\n  url: ${m.url}\n  sourceUrl: ${m.sourceUrl}${attrs ? `\n  ${attrs}` : ''}`
              })
              return `${text}\n\nMedia results for visual/artifact use:\n${mediaLines.join('\n')}`
            })
            .join('\n\n---\n\n')

        return {
          content: [{ type: 'text' as const, text: formatted }],
          details
        }
      }

      const result = searchQueue.then(search, search)
      searchQueue = result.then(
        () => undefined,
        () => undefined
      )
      return result
    }
  }
}
