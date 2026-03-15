import { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import { getSplitter, loadFileContent } from '../../ai/rag'
import { getModelFromProvider } from '../../ai/utils/chat-message-util'
import {
  createResource,
  findRelevantContent,
  getResourcePaginated
} from '../../db/queries'
import { ChatSDKError } from '../errors'
import {
  getPaginationParams,
  handleDatabaseOperation,
  successResponse,
  validateEmbeddingModel
} from '../utils'

const rag = new Hono<{ Variables: Variables }>()

rag.post('/retrieve', async (c) => {
  const setting = c.get('setting')
  const { embeddingConfig } = getModelFromProvider(setting)
  const validatedConfig = validateEmbeddingModel(embeddingConfig)

  try {
    const { question } = await c.req.json()
    const result = await findRelevantContent(
      { userQuery: question },
      validatedConfig
    )

    return successResponse(c, result)
  } catch (error) {
    if (error instanceof ChatSDKError) throw error
    throw new ChatSDKError(
      'bad_request:rag',
      error instanceof Error
        ? error.message
        : 'Failed to retrieve relevant content'
    )
  }
})

rag.post('/', async (c) => {
  const formData = await c.req.formData()
  const setting = c.get('setting')
  const { embeddingConfig } = getModelFromProvider(setting)
  const validatedConfig = validateEmbeddingModel(embeddingConfig)

  try {
    const files = formData.getAll('files') as File[]
    if (!files || files.length === 0) {
      throw new ChatSDKError('bad_request:rag', 'No files provided')
    }

    for (const file of files) {
      const content = await loadFileContent(file)
      const splitter = getSplitter(content)
      const chunks = await splitter.splitText(content)
      await createResource({ content, chunks }, validatedConfig)
    }

    return successResponse(c, { success: true })
  } catch (error) {
    if (error instanceof ChatSDKError) throw error
    throw new ChatSDKError(
      'bad_request:rag',
      error instanceof Error ? error.message : 'Failed to upload documents'
    )
  }
})

rag.get('/', async (c) => {
  const { page, pageSize } = getPaginationParams(c)

  const result = await handleDatabaseOperation(
    () => getResourcePaginated(page, pageSize),
    'Failed to get resources'
  )

  return successResponse(c, result)
})

export default rag
