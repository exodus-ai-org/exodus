import { Setting } from '@shared/types/db'
import { tool } from 'ai'
import { z } from 'zod'
import { findRelevantContent } from '../../db/queries'
import { getModelFromProvider } from '../utils/chat-message-util'

export const rag = (setting: Setting) =>
  tool({
    description:
      "Search the local knowledge base for information relevant to the user's question.",
    inputSchema: z.object({
      question: z
        .string()
        .describe('The question to look up in the knowledge base.')
    }),
    execute: async ({ question }) => {
      const { embeddingModel } = getModelFromProvider(setting)
      if (!embeddingModel) {
        throw new Error(
          'No embedding model configured. Set up a provider with embedding support in settings.'
        )
      }
      return findRelevantContent(
        { userQuery: question },
        { model: embeddingModel }
      )
    }
  })
