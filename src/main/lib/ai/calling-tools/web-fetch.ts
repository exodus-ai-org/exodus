import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'

const MAX_CONTENT_LENGTH = 50_000

function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{3,}/g, '\n\n')
    .trim()
}

const webFetchSchema = Type.Object({
  url: Type.String({ description: 'The URL to fetch.' }),
  raw: Type.Optional(
    Type.Boolean({
      description:
        'If true, return raw response without HTML-to-text conversion. Useful for JSON APIs or plain text files. Default: false.'
    })
  )
})

export const webFetch: AgentTool<typeof webFetchSchema> = {
  name: 'webFetch',
  label: 'Web Fetch',
  description:
    'Fetch the content of a URL and return it as text. ' +
    'Use this to read documentation pages, API references, GitHub files, or any web page. ' +
    'HTML pages are automatically converted to plain text. ' +
    'Do not use this for web search — use webSearch instead.',
  parameters: webFetchSchema,
  execute: async (_toolCallId, { url, raw }) => {
    let response: Response
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Exodus-AI/1.0)',
          Accept:
            'text/html,application/xhtml+xml,application/json,text/plain,*/*'
        },
        signal: AbortSignal.timeout(15_000)
      })
    } catch (e) {
      throw new Error(
        `Failed to fetch URL: ${e instanceof Error ? e.message : String(e)}`
      )
    }

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} ${response.statusText} for ${url}`
      )
    }

    const contentType = response.headers.get('content-type') ?? ''
    let text = await response.text()

    const isHtml = contentType.includes('text/html')
    if (isHtml && !raw) {
      text = htmlToText(text)
    }

    const truncated = text.length > MAX_CONTENT_LENGTH
    if (truncated) {
      text = text.slice(0, MAX_CONTENT_LENGTH)
    }

    const details = {
      url,
      contentType,
      length: text.length,
      truncated,
      content: text
    }
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(details) }],
      details
    }
  }
}
