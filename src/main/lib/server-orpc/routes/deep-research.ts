import { EventPublisher, os } from '@orpc/server'
import { ErrorCode } from '@shared/constants/error-codes'
import {
  ConfigurationError,
  NotFoundError,
  ValidationError
} from '@shared/errors'
import {
  DeepResearchProgress,
  ReportProgressPayload
} from '@shared/types/deep-research'
import { JSONRPCNotification, LanguageModelV1 } from 'ai'
import { v4 as uuidV4 } from 'uuid'
import z from 'zod'
import { deepResearch as deepResearchAgent } from '../../ai/deep-research/deep-research'
import { writeFinalReport } from '../../ai/deep-research/final-report'
import { getModelFromProvider } from '../../ai/utils/chat-message-util'
import {
  getDeepResearchById,
  getDeepResearchMessagesById,
  getSettings,
  saveDeepResearchMessage,
  updateDeepResearch
} from '../../db/queries'

// Event publisher for deep research progress updates
// Each deep research session publishes events to its own channel (deepResearchId)
const deepResearchPublisher = new EventPublisher<{
  [deepResearchId: string]: {
    id: string
    deepResearchId: string
    message: JSONRPCNotification
    createdAt: Date
  }
}>()

/**
 * Helper function to notify clients about deep research progress
 * Saves message to database and publishes to event stream
 */
async function notifyProgress(
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

  // Save to database for persistence
  await saveDeepResearchMessage(deepResearchMessage)

  // Publish to event stream for real-time updates
  deepResearchPublisher.publish(deepResearchId, deepResearchMessage)
}

// Get deep research messages by ID
export const getMessages = os
  .input(
    z.object({
      id: z.string()
    })
  )
  .handler(async ({ input }) => {
    return await getDeepResearchMessagesById({ id: input.id })
  })

// Get deep research result by ID
export const getResult = os
  .input(
    z.object({
      id: z.string()
    })
  )
  .handler(async ({ input }) => {
    const result = await getDeepResearchById({ id: input.id })
    if (!result) {
      throw new NotFoundError(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Deep research not found',
        { id: input.id }
      )
    }
    return result
  })

/**
 * Start a new deep research session
 * Runs research in background and publishes progress updates via event stream
 */
export const start = os
  .input(
    z.object({
      deepResearchId: z.string(),
      query: z.string()
    })
  )
  .handler(async ({ input }) => {
    const { deepResearchId, query } = input

    if (!query.trim()) {
      throw new ValidationError(
        ErrorCode.VALIDATION_INVALID_INPUT,
        'Query cannot be empty'
      )
    }

    // Get settings
    const setting = await getSettings()
    if (!('id' in setting)) {
      throw new ConfigurationError(
        ErrorCode.SETTING_NOT_FOUND,
        'Failed to retrieve settings'
      )
    }

    if (!setting.providerConfig?.reasoningModel) {
      throw new ConfigurationError(ErrorCode.CONFIG_MISSING_REASONING_MODEL)
    }

    if (!setting.webSearch?.serperApiKey) {
      throw new ConfigurationError(
        ErrorCode.CONFIG_INVALID,
        'Serper API Key is missing. Please configure it in settings.'
      )
    }

    const { reasoningModel } = await getModelFromProvider()

    // Run deep research in background (don't await)
    // This allows the handler to return immediately while research continues
    runDeepResearch(deepResearchId, query, {
      breadth: setting.deepResearch?.breadth ?? 4,
      depth: setting.deepResearch?.depth ?? 2,
      serperApiKey: setting.webSearch.serperApiKey,
      reasoningModel
    }).catch((error) => {
      console.error('Deep research failed:', error)
      // Notify client of failure
      notifyProgress(deepResearchId, {
        type: DeepResearchProgress.CompleteDeepResearch,
        query
      })
    })

    return { success: true, deepResearchId }
  })

/**
 * Subscribe to deep research progress updates via SSE
 * Uses ORPC event iterator (async generator) for streaming
 */
export const subscribe = os
  .input(
    z.object({
      deepResearchId: z.string()
    })
  )
  .handler(async function* ({ input, signal }) {
    const { deepResearchId } = input

    try {
      // Subscribe to events for this specific deep research session
      const iterator = deepResearchPublisher.subscribe(deepResearchId, {
        signal
      })

      // Yield each event as it arrives
      for await (const message of iterator) {
        yield message
      }
    } finally {
      // Cleanup when connection closes
      console.log(`Deep research subscription closed: ${deepResearchId}`)
    }
  })

/**
 * Background function that runs the deep research process
 * Publishes progress updates via event stream
 */
async function runDeepResearch(
  deepResearchId: string,
  query: string,
  options: {
    breadth: number
    depth: number
    serperApiKey: string
    reasoningModel: LanguageModelV1
  }
) {
  const { breadth, depth, serperApiKey, reasoningModel } = options

  // Notify start
  await notifyProgress(deepResearchId, {
    type: DeepResearchProgress.StartDeepResearch
  })

  // Run deep research agent
  const { learnings, webSources } = await deepResearchAgent(
    { query, breadth, depth },
    {
      serperApiKey,
      model: reasoningModel,
      notify: (data) => notifyProgress(deepResearchId, data)
    }
  )

  // Write final report
  await notifyProgress(deepResearchId, {
    type: DeepResearchProgress.StartWritingFinalReport
  })

  const report = await writeFinalReport(
    { prompt: query, learnings },
    { model: reasoningModel }
  )

  // Update database with final results
  const deepResearchById = await getDeepResearchById({ id: deepResearchId })
  await updateDeepResearch({
    ...deepResearchById,
    finalReport: report,
    webSources: [...webSources.values()],
    jobStatus: 'archived',
    endTime: new Date()
  })

  // Notify completion
  await notifyProgress(deepResearchId, {
    type: DeepResearchProgress.CompleteDeepResearch,
    query
  })
}
