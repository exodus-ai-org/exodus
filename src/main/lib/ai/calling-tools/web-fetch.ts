import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { Setting } from '@shared/types/db'

import { loadDocument } from '../utils/web-search-util'

const webFetchSchema = Type.Object({
  url: Type.String({ description: 'The URL to fetch.' })
})

export const webFetch = (
  setting?: Setting
): AgentTool<typeof webFetchSchema> => ({
  name: 'webFetch',
  label: 'Web Fetch',
  description:
    'Fetch the content of a URL and return it as clean Markdown. ' +
    'Use this to read documentation pages, API references, GitHub files, or any web page. ' +
    'Do not use this for web search — use webSearch instead.',
  parameters: webFetchSchema,
  execute: async (_toolCallId, { url }) => {
    const provider = setting?.webSearch?.urlToMarkdownProvider ?? 'jina'
    const result = await loadDocument(url, provider)

    if (!result) {
      throw new Error(`Failed to fetch or parse URL: ${url}`)
    }

    const details = {
      url,
      length: result.content.length,
      content: result.content
    }
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(details) }],
      details
    }
  }
})
