import { fetcher } from '@shared/utils/http'
import { tool } from 'ai'
import { z } from 'zod'

export const rag = tool({
  description: 'Get information from your knowledge base to answer questions.',
  inputSchema: z.object({
    question: z.string().describe('the users question')
  }),
  execute: async ({ question }) => {
    const result = await fetcher('/api/rag/retrieve', {
      method: 'POST',
      body: {
        question
      }
    })

    return result
  }
})
