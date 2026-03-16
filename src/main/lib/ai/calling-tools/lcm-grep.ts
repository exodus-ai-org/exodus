import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { searchSummaries } from '../context-management/queries'

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
    'Search through compressed conversation history (LCM summaries) for a specific pattern. ' +
    'Use this as the first step when you need to recall something from earlier in a long conversation. ' +
    'Returns snippets with summary IDs that can be passed to lcmDescribe for full content.',
  parameters: lcmGrepSchema,
  execute: async (_toolCallId, { chatId, pattern, limit = 10 }) => {
    const results = await searchSummaries(chatId, pattern)
    const limited = results.slice(0, limit)

    const details = limited.map((r) => ({
      summaryId: r.summary.id,
      kind: r.summary.kind,
      depth: r.summary.depth,
      earliestAt: r.summary.earliestAt,
      latestAt: r.summary.latestAt,
      tokenCount: r.summary.tokenCount,
      snippet: r.snippet
    }))

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify(details, null, 2) }
      ],
      details
    }
  }
}
