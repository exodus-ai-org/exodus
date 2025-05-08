import { tool } from 'ai'
import { z } from 'zod'

export const deepResearch = tool({
  description:
    'Given a research subject and ask some follow up questions to clarify the research direction',
  parameters: z.object({
    subject: z.string().describe('The subject to research.')
  }),
  execute: async ({ subject }: { subject: string }, { toolCallId }) => {
    const params = {
      jsonrpc: '2.0',
      method: 'deep-research',
      params: { message: subject },
      id: toolCallId
    }
    console.log(params)

    return null
  }
})
