import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { searchMessages, searchSummaries } from '../context/queries'

const lcmGrepSchema = Type.Object({
  chatId: Type.String({ description: 'The chat session ID to search within.' }),
  pattern: Type.String({
    description:
      'Regex or literal string to search for in conversation summaries and messages.'
  }),
  limit: Type.Optional(
    Type.Number({
      description: 'Maximum number of results to return. Default: 10.',
      minimum: 1,
      maximum: 50
    })
  )
})

export const lcmGrep: AgentTool<typeof lcmGrepSchema> = {
  name: 'lcmGrep',
  label: 'LCM Search',
  description:
    'Search through conversation history (LCM summaries and raw messages) for a specific pattern. ' +
    'Use this as the first step when you need to recall something from earlier in a long conversation. ' +
    'Returns snippets with summary IDs (for lcmDescribe) or message previews.',
  parameters: lcmGrepSchema,
  execute: async (_toolCallId, { chatId, pattern, limit = 10 }) => {
    const [summaryResults, messageResults] = await Promise.all([
      searchSummaries(chatId, pattern),
      searchMessages(chatId, pattern)
    ])

    const summaryHits = summaryResults.slice(0, limit).map((r) => ({
      type: 'summary' as const,
      summaryId: r.summary.id,
      kind: r.summary.kind,
      depth: r.summary.depth,
      earliestAt: r.summary.earliestAt,
      latestAt: r.summary.latestAt,
      tokenCount: r.summary.tokenCount,
      snippet: r.snippet
    }))

    const messageHits = messageResults
      .slice(0, Math.max(0, limit - summaryHits.length))
      .map((r) => ({
        type: 'message' as const,
        messageId: r.messageId,
        role: r.role,
        createdAt: r.createdAt,
        snippet: r.snippet
      }))

    const details = [...summaryHits, ...messageHits]

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify(details, null, 2) }
      ],
      details
    }
  }
}
