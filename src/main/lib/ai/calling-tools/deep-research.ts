import { tool } from 'ai'
import { v4 as uuidV4 } from 'uuid'
import { z } from 'zod'

export const deepResearch = tool({
  description:
    'Given a research subject and ask some follow up questions to clarify the research direction',
  parameters: z.object({
    subject: z.string().describe('The subject to research.')
  }),
  execute: async ({ subject }: { subject: string }) => {
    return { id: uuidV4, type: 'deep-research', done: false, subject }
  }
})
