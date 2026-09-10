import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { Settings } from '@shared/types/db'
import type { WebSearchResult } from '@shared/types/web-search'

import { getModelFromProvider } from '../utils/model-util'
import { expandQuery } from '../utils/query-expansion'
import { fetchWebSearch } from '../utils/web-search-util'

const webSearchSchema = Type.Object({
  query: Type.String({
    description:
      'Keyword-style query, not a full question. Keep it under ~40 words. Use "quoted phrases" for exact matches, -term to exclude, site:domain to scope. Suffix a year/date when recency matters. Start broad; only add specifics on a follow-up search if the first was too general.'
  }),
  precision: Type.Optional(
    Type.Union([Type.Literal('broad'), Type.Literal('strict')], {
      description:
        'Relevance filter. "broad" (default) maximizes recall. Use "strict" on a follow-up search when the broad results were noisy or off-topic.'
    })
  ),
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
    description: `Search the web for up-to-date information. Results are numbered [1],[2],… — you MUST cite every factual sentence in your reply using 【N-source】 markers. Higher-numbered results are snippet-only breadth hits; call webFetch on one to read it in full. Set media="images", "videos", or "all" when the user asks for a visual artifact, visual comparison, product/place explanation, tutorial, or any answer that would be better with media. Today is ${new Date().toISOString()}`,
    parameters: webSearchSchema,
    execute: async (_toolCallId, { query, media, precision }, signal) => {
      const search = async () => {
        if (signal?.aborted) throw new Error('Aborted')
        if (!setting?.webSearch?.braveApiKey) {
          throw new Error(
            'Web Search requires a Brave Search API Key. Please add it in Settings → Web Search.'
          )
        }
        const ws = setting.webSearch
        const deep = ws.deepRecall !== false

        // Fan-out: expand the query into complementary phrasings so recall
        // isn't bounded by one wording. Best-effort — a resolution or LLM
        // failure just searches the original query alone.
        let expandedQueries: string[] = []
        if (deep) {
          try {
            const { chatModel, apiKey } = getModelFromProvider(setting)
            expandedQueries = await expandQuery(
              query,
              chatModel,
              apiKey,
              signal
            )
          } catch {
            expandedQueries = []
          }
        }

        const details = await fetchWebSearch({
          query,
          braveApiKey: ws.braveApiKey!,
          webSources,
          expandedQueries,
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
          // Deep recall (grounding + web/search breadth pass) is on unless the
          // user turned it off to conserve Brave API quota.
          deep,
          threshold: precision,
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
                  m.creator ? `creator: ${m.creator}` : '',
                  m.views ? `views: ${m.views}` : '',
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
