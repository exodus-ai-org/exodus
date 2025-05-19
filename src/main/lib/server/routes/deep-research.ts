import {
  DeepResearchProgress,
  ReportProgressPayload
} from '@shared/types/deep-research'
import { Variables } from '@shared/types/server'
import { JSONRPCNotification } from 'ai'
import { Hono } from 'hono'
import { v4 as uuidV4 } from 'uuid'
import { deepResearch as deepResearchAgent } from '../../ai/deep-research/deep-research'
import { writeFinalReport } from '../../ai/deep-research/final-report'
import { getModelFromProvider } from '../../ai/utils'
import {
  getDeepResearchById,
  getDeepResearchMessagesById,
  getSettings,
  saveDeepResearchMessage,
  updateDeepResearch
} from '../../db/queries'

const deepResearch = new Hono<{ Variables: Variables }>()
const clients = new Map<string, ReadableStreamDefaultController>()

function registerClient(
  deepResearchId: string,
  controller: ReadableStreamDefaultController
) {
  clients.set(deepResearchId, controller)
}

function unregisterClient(deepResearchId: string) {
  const set = clients.get(deepResearchId)
  if (set) {
    clients.delete(deepResearchId)
  }
}

async function notifyClients(
  deepResearchId: string,
  data: ReportProgressPayload
) {
  const message: JSONRPCNotification = {
    jsonrpc: '2.0',
    method: 'message/deep-research',
    params: { data }
  }

  const deepResearchMessage = {
    id: uuidV4(),
    deepResearchId,
    message,
    createdAt: new Date()
  }

  await saveDeepResearchMessage(deepResearchMessage)

  try {
    const controller = clients.get(deepResearchId)
    if (!controller) return

    controller.enqueue(
      new TextEncoder().encode(
        `data: ${JSON.stringify(deepResearchMessage)}\n\n`
      )
    )
  } catch (err) {
    console.error('SSE enqueue failed:', err)
  }
}

deepResearch.post('/', async (c) => {
  const { deepResearchId, query } = await c.req.json()
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

  await notifyClients(deepResearchId, {
    type: DeepResearchProgress.StartDeepResearch
  })
  const { learnings, webSources } = await deepResearchAgent(
    {
      query,
      breadth: settings.deepResearch?.breadth ?? 4,
      depth: settings.deepResearch?.depth ?? 2
    },
    {
      serperApiKey: settings.webSearch?.serperApiKey as string,
      model: reasoningModel,
      notify: (data) => notifyClients(deepResearchId, data)
    }
  )

  await notifyClients(deepResearchId, {
    type: DeepResearchProgress.StartWritingFinalReport
  })
  const report = await writeFinalReport(
    {
      prompt: query,
      learnings
    },
    { model: reasoningModel }
  )

  const deepResearchById = await getDeepResearchById({ id: deepResearchId })
  const finalDeepResearch = await updateDeepResearch({
    ...deepResearchById,
    finalReport: report,
    webSources: [...webSources.values()],
    jobStatus: 'archived',
    endTime: new Date()
  })
  await notifyClients(deepResearchId, {
    type: DeepResearchProgress.CompleteDeepResearch,
    query
  })

  return c.json(finalDeepResearch)
})

deepResearch.get('/sse', async (c) => {
  const deepResearchId = c.req.query('deepResearchId')

  if (!deepResearchId) {
    throw new Error('No deep research id found!')
  }

  const controller = new ReadableStream({
    start(controller) {
      registerClient(deepResearchId as string, controller)

      c.req.raw.signal.addEventListener('abort', () => {
        unregisterClient(deepResearchId)
        controller.close()
      })
    }
  })

  return new Response(controller, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  })
})

deepResearch.get('/messages/:id', async (c) => {
  const { id } = c.req.param()
  const messages = await getDeepResearchMessagesById({ id })
  return c.json(messages)
})

deepResearch.get('/result/:id', async (c) => {
  const { id } = c.req.param()
  const result = await getDeepResearchById({ id })
  return c.json(result)
})

export default deepResearch
