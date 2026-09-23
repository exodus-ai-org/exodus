import type { AgentTool } from '@earendil-works/pi-agent-core'
import { Type } from '@earendil-works/pi-ai'
import { TOOL_NAMES } from '@exodus/shared/constants/tool-names'
import type { WebSearchResult } from '@exodus/shared/types/web-search'

import { loadDocument } from '../utils/web-search-util'

const webFetchSchema = Type.Object({
  url: Type.String({ description: 'The URL to fetch.' })
})

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Title = first markdown heading, else the hostname. */
function titleOf(markdown: string, url: string): string {
  const h = markdown.match(/^#{1,3}\s+(.+?)\s*$/m)?.[1]?.trim()
  return h && h.length <= 200 ? h : hostnameOf(url)
}

function plainExcerpt(markdown: string, n: number): string {
  return markdown
    .replace(/^#{1,6}\s+.*$/gm, '')
    .replace(/[#*_`>[\]()!]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, n)
}

/**
 * `webSources` is the same rank registry `web_search` uses. Registering the
 * fetched page here means a summary the model writes from a webFetch result
 * can carry a real 【N-source】 citation even when webSearch never ran.
 */
export const webFetch = (
  webSources?: Map<string, WebSearchResult>
): AgentTool<typeof webFetchSchema> => ({
  name: TOOL_NAMES.webFetch,
  label: 'Web Fetch',
  description:
    'Fetch the content of a URL and return it as clean Markdown. ' +
    'Use this to read documentation pages, API references, GitHub files, or any web page. ' +
    'Do not use this for web search — use web_search instead. ' +
    'The result is numbered [N]; cite facts drawn from it with 【N-source】, same as web_search results.',
  parameters: webFetchSchema,
  execute: async (_toolCallId, { url }, signal) => {
    if (signal?.aborted) throw new Error('Aborted')
    const result = await loadDocument(url, signal)

    if (!result) {
      throw new Error(`Failed to fetch or parse URL: ${url}`)
    }

    const title = titleOf(result.content, url)
    let source: WebSearchResult | undefined

    if (webSources) {
      const existing = webSources.get(url)
      source = existing ?? {
        rank: webSources.size + 1,
        link: url,
        title,
        // Only a preview is kept here — the model gets the full page via the
        // tool result text, and the citation UI shows just `snippet`.
        content: plainExcerpt(result.content, 600),
        snippet: plainExcerpt(result.content, 300),
        hostname: hostnameOf(url),
        thumbnail: result.ogImage || undefined
      }
      webSources.set(url, source)
    }

    const rank = source?.rank
    const header = rank
      ? `[${rank}] ${title}\nURL: ${url}\nCite facts from this page with 【${rank}-source】.\n\n`
      : ''

    return {
      content: [{ type: 'text' as const, text: `${header}${result.content}` }],
      details: source ?? { url, length: result.content.length }
    }
  }
})
