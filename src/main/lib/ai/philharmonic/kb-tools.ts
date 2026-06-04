// src/main/lib/ai/philharmonic/kb-tools.ts
import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'

import { searchKnowledgeDocs } from '../../db/knowledge-queries'

/**
 * Knowledge base search tool, scoped to a Group's allowed teams.
 *
 * The team scope is captured at construction time and applied server-side;
 * the LLM never names a team. General docs (teamId = null) are always included.
 *
 * @param allowedTeamIds Teams whose docs are visible to this Group, derived
 *   from the conversation's current members. `[]` is valid and means "General
 *   docs only" — the safe default for a brand-new Group with no employees yet.
 *   `null` is reserved for unrestricted global use (currently unused at
 *   runtime; left in the underlying query signature for UI calls).
 */
export function createSearchKnowledgeBaseTool(
  allowedTeamIds: string[]
): AgentTool {
  return {
    name: 'searchKnowledgeBase',
    label: 'Search Knowledge Base',
    description:
      'Search this Group’s knowledge base for relevant documents. Use before asking the user about company-specific facts.',
    parameters: Type.Object({
      query: Type.String({ description: 'What to look up' })
    }),
    execute: async (_id: string, params: { query: string }) => {
      const hits = await searchKnowledgeDocs(params.query, allowedTeamIds)
      const text =
        hits.length === 0
          ? `No knowledge base documents matched "${params.query}".`
          : hits
              .map((h, i) => `${i + 1}. ${h.title}\n${h.snippet}`)
              .join('\n\n')
      return {
        content: [{ type: 'text' as const, text }],
        details: { query: params.query, hits }
      }
    }
  } as AgentTool
}
