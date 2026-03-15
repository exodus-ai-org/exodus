import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { Setting } from '@shared/types/db'
import { findRelevantContent } from '../../db/queries'
import { getModelFromProvider } from '../utils/chat-message-util'

const ragSchema = Type.Object({
  question: Type.String({
    description: 'The question to look up in the knowledge base.'
  })
})

export const rag = (setting: Setting): AgentTool<typeof ragSchema> => ({
  name: 'rag',
  label: 'Knowledge Base',
  description:
    "Search the local knowledge base for information relevant to the user's question.",
  parameters: ragSchema,
  execute: async (_toolCallId, { question }) => {
    const { embeddingConfig } = getModelFromProvider(setting)
    if (!embeddingConfig) {
      throw new Error(
        'No embedding model configured. Set up a provider with embedding support in settings.'
      )
    }
    const details = await findRelevantContent(
      { userQuery: question },
      embeddingConfig
    )
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(details) }],
      details
    }
  }
})
