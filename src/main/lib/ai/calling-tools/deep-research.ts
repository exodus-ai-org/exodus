import { BASE_URL } from '@shared/constants/systems'
import { DeepResearch } from '@shared/types/db'
import { tool } from 'ai'
import { v4 as uuidV4 } from 'uuid'
import { z } from 'zod'
import { saveDeepResearch } from '../../db/queries'

export const deepResearch = tool({
  description:
    'Given a research subject and ask some follow up questions to clarify the research direction',
  parameters: z.object({
    subject: z.string().describe('The subject to research')
  }),
  execute: async ({ subject }: { subject: string }, { toolCallId }) => {
    const newDeepResearch: DeepResearch = {
      id: uuidV4(),
      toolCallId,
      title: null,
      jobStatus: 'submitted',
      finalReport: null,
      startTime: new Date(),
      endTime: null
    }
    await saveDeepResearch(newDeepResearch)
    fetch(
      `${BASE_URL}/api/deep-research?id=${newDeepResearch.id}&subject=${subject}`
    )
    return newDeepResearch
  }
})
