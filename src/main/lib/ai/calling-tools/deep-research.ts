import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { DeepResearch } from '@shared/types/db'
import { fetcher } from '@shared/utils/http'
import { v4 as uuidV4 } from 'uuid'

import { saveDeepResearch } from '../../db/queries'

const deepResearchSchema = Type.Object({
  subject: Type.String({ description: 'The subject to research' })
})

export const deepResearch: AgentTool<typeof deepResearchSchema> = {
  name: 'deepResearch',
  label: 'Deep Research',
  description:
    'Given a research subject and ask some follow up questions to clarify the research direction',
  parameters: deepResearchSchema,
  execute: async (toolCallId, { subject }) => {
    try {
      const newDeepResearch: DeepResearch = {
        id: uuidV4(),
        toolCallId,
        title: subject,
        jobStatus: 'streaming',
        finalReport: null,
        webSources: null,
        startTime: new Date(),
        endTime: null
      }

      await saveDeepResearch(newDeepResearch)
      fetcher('/api/deep-research', {
        method: 'POST',
        body: {
          deepResearchId: newDeepResearch.id,
          query: subject
        }
      })

      const details = {
        id: newDeepResearch.id,
        toolCallId
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(details) }],
        details
      }
    } catch (e) {
      const errMsg =
        e instanceof Error
          ? e.message
          : 'Failed to use deeply research the subject'
      return {
        content: [{ type: 'text' as const, text: errMsg }],
        details: { error: errMsg }
      }
    }
  }
}
