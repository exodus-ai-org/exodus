import type { JSONRPCNotification } from '@modelcontextprotocol/sdk/types.js'
import {
  DeepResearchProgress,
  ReportProgressPayload
} from '@shared/types/deep-research'
import { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import { v4 as uuidV4 } from 'uuid'

import { deepResearch as deepResearchAgent } from '../../ai/deep-research/deep-research'
import { writeFinalReport } from '../../ai/deep-research/final-report'
import { getModelFromProvider } from '../../ai/utils/chat-message-util'
import {
  getDeepResearchById,
  getDeepResearchMessagesById,
  saveDeepResearchMessage,
  updateDeepResearch
} from '../../db/queries'
import { ChatSDKError } from '../errors'
import { createDeepResearchSchema } from '../schemas/deep-research'
import {
  getRequiredQuery,
  handleDatabaseOperation,
  successResponse,
  validatePerplexityApiKey,
  validateSchema
} from '../utils'

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
  const { deepResearchId, query } = validateSchema<{
    deepResearchId: string
    query: string
  }>(
    createDeepResearchSchema,
    await c.req.json(),
    'deep_research',
    'Invalid request body'
  )

  const setting = c.get('setting')

  if (!setting || !('id' in setting)) {
    throw new ChatSDKError('not_found:setting', 'Failed to retrieve setting')
  }

  if (!setting.providerConfig?.reasoningModel) {
    throw new ChatSDKError(
      'bad_request:deep_research',
      'Reasoning model is not configured'
    )
  }

  const perplexityApiKey = validatePerplexityApiKey(setting)

  const { reasoningModel, apiKey } = getModelFromProvider(setting)

  await notifyClients(deepResearchId, {
    type: DeepResearchProgress.StartDeepResearch
  })
  const { learnings, webSources } = await deepResearchAgent(
    {
      query,
      breadth: setting.deepResearch?.breadth ?? 4,
      depth: setting.deepResearch?.depth ?? 2
    },
    {
      perplexityApiKey,
      model: reasoningModel,
      apiKey,
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
    { model: reasoningModel, apiKey }
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

  return successResponse(c, finalDeepResearch)
})

deepResearch.get('/sse', async (c) => {
  const deepResearchId = getRequiredQuery(c, 'deepResearchId', 'deep_research')

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

  const messages = await handleDatabaseOperation(
    () => getDeepResearchMessagesById({ id }),
    'Failed to get deep research messages'
  )

  return successResponse(c, messages)
})

deepResearch.get('/result/:id', async (c) => {
  const { id } = c.req.param()

  const result = await handleDatabaseOperation(
    () => getDeepResearchById({ id }),
    'Failed to get deep research result'
  )

  if (!result) {
    throw new ChatSDKError(
      'not_found:deep_research',
      `Deep research with ID ${id} not found`
    )
  }

  return successResponse(c, result)
})

export default deepResearch
