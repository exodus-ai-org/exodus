import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'

import {
  getChildIds,
  getParentIds,
  getSourceMessageIds,
  getSummaryById
} from '../context/queries'

const lcmDescribeSchema = Type.Object({
  id: Type.String({
    description:
      'The summary ID (e.g. "sum_abc123...") returned by lcmGrep. ' +
      'Returns the full content and DAG metadata.'
  })
})

export const lcmDescribe: AgentTool<typeof lcmDescribeSchema> = {
  name: 'lcmDescribe',
  label: 'LCM Describe',
  description:
    'Retrieve the full content and metadata of a specific LCM summary by its ID. ' +
    'Use this after lcmGrep to read a full summary. ' +
    'The response includes parent/child summary IDs for DAG traversal.',
  parameters: lcmDescribeSchema,
  execute: async (_toolCallId, { id }) => {
    const summary = await getSummaryById(id)
    if (!summary) {
      return {
        content: [
          { type: 'text' as const, text: `Summary "${id}" not found.` }
        ],
        details: null
      }
    }

    const [parentIds, childIds, sourceMessageIds] = await Promise.all([
      getParentIds(id),
      getChildIds(id),
      getSourceMessageIds(id)
    ])

    const details = {
      id: summary.id,
      kind: summary.kind,
      depth: summary.depth,
      tokenCount: summary.tokenCount,
      descendantCount: summary.descendantCount,
      earliestAt: summary.earliestAt,
      latestAt: summary.latestAt,
      parentIds,
      childIds,
      sourceMessageIds,
      content: summary.content
    }

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify(details, null, 2) }
      ],
      details
    }
  }
}
