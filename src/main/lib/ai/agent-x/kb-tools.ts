// src/main/lib/ai/agent-x/kb-tools.ts
import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'

import { searchKnowledgeDocs } from '../../db/knowledge-queries'

/** Shared company knowledge base search. STUB today; RAG-shaped for the future. */
export function createSearchKnowledgeBaseTool(): AgentTool {
  return {
    name: 'searchKnowledgeBase',
    label: 'Search Knowledge Base',
    description:
      'Search the shared company knowledge base for relevant documents. Use before asking the user about company-specific facts.',
    parameters: Type.Object({
      query: Type.String({ description: 'What to look up' })
    }),
    execute: async (_id: string, params: { query: string }) => {
      const hits = await searchKnowledgeDocs(params.query)
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
