import { Hono } from 'hono'
import { deepResearch as deepResearchWork } from '../../ai/deep-research/deep-research'
import { writeFinalReport } from '../../ai/deep-research/final-report'
import { sendSseMessage } from '../../ai/deep-research/sse'
import { getModelFromProvider } from '../../ai/utils'
import { getSettings } from '../../db/queries'

// type Type = 'queries-generation' | 'website-reading' | 'report-generation'

export interface DeepResearchMessagePayload {
  type: ''
}

const deepResearch = new Hono()

deepResearch.get('/', async (c) => {
  const { id: deepResearchId, object } = c.req.query()
  const settings = await getSettings()

  if (!('id' in settings)) {
    throw new Error('Failed to retrieve settings.')
  }

  if (!settings.providerConfig?.reasoningModel) {
    throw new Error('Failed to retrieve selected reasoning model.')
  }

  if (!settings.webSearch?.serperApiKey) {
    throw new Error('Failed to retrieve Serper API Key.')
  }

  const { reasoningModel } = await getModelFromProvider()

  const stream = new ReadableStream({
    async start(controller) {
      await sendSseMessage({ controller, deepResearchId, payload: '' })

      const { learnings, visitedUrls } = await deepResearchWork({
        serperApiKey: settings.webSearch?.serperApiKey as string,
        deepResearchId,
        model: reasoningModel,
        query: object,
        breadth: 3,
        depth: 2
      })
      await sendSseMessage({ controller, deepResearchId, payload: '' })

      const report = await writeFinalReport({
        deepResearchId,
        model: reasoningModel,
        prompt: '',
        learnings,
        visitedUrls
      })
      console.log(report)

      await sendSseMessage({ controller, deepResearchId, payload: '' })
      controller.close()

      c.req.raw.signal.onabort = () => {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  })
})

export default deepResearch
