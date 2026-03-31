import type { JSONRPCNotification } from '@modelcontextprotocol/sdk/types.js'
import { ErrorCode } from '@shared/constants/error-codes'
import { ConfigurationError, NotFoundError } from '@shared/errors/app-error'
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
import { createDeepResearchSchema } from '../schemas/deep-research'
import {
  getRequiredQuery,
  handleDatabaseOperation,
  successResponse,
  validatePerplexityApiKey,
  validateSchema
} from '../utils'
import { SSE_HEADERS, SseManager } from '../utils/sse-manager'

const deepResearch = new Hono<{ Variables: Variables }>()
const sseManager = new SseManager<string>()

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

  if (!sseManager.hasClients(deepResearchId)) return

  const payload = sseManager.encodeEvent(
    deepResearchMessage as unknown as Record<string, unknown>
  )
  sseManager.emitRaw(deepResearchId, payload)
}

deepResearch.post('/', async (c) => {
  const { deepResearchId, query } = validateSchema<{
    deepResearchId: string
    query: string
  }>(createDeepResearchSchema, await c.req.json(), 'Invalid request body')

  const setting = c.get('settings')

  if (!setting || !('id' in setting)) {
    throw new NotFoundError(
      ErrorCode.SETTING_NOT_FOUND,
      'Failed to retrieve setting'
    )
  }

  if (!setting.providerConfig?.reasoningModel) {
    throw new ConfigurationError(
      ErrorCode.CONFIG_MISSING_REASONING_MODEL,
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
  const deepResearchId = getRequiredQuery(c, 'deepResearchId')

  const stream = new ReadableStream({
    start(controller) {
      sseManager.register(deepResearchId, controller, c.req.raw.signal)
    }
  })

  return new Response(stream, { headers: SSE_HEADERS })
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
    throw new NotFoundError(
      ErrorCode.DEEP_RESEARCH_NOT_FOUND,
      `Deep research with ID ${id} not found`
    )
  }

  return successResponse(c, result)
})

export default deepResearch
