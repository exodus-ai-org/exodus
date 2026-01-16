import { os } from '@orpc/server'
import { ErrorCode } from '@shared/constants/error-codes'
import { ConfigurationError } from '@shared/errors'
import z from 'zod'
import { getSplitter, loadFileContent } from '../../ai/rag'
import { getModelFromProvider } from '../../ai/utils/chat-message-util'
import {
  createResource,
  findRelevantContent,
  getResourcePaginated
} from '../../db/queries'

export const retrieve = os
  .input(
    z.object({
      question: z.string()
    })
  )
  .handler(async ({ input }) => {
    const { embeddingModel } = await getModelFromProvider()
    if (!embeddingModel) {
      throw new ConfigurationError(ErrorCode.CONFIG_MISSING_EMBEDDING_MODEL)
    }

    return await findRelevantContent(
      { userQuery: input.question },
      { model: embeddingModel }
    )
  })

export const upload = os
  .input(z.array(z.instanceof(File)))
  .handler(async ({ input }) => {
    const { embeddingModel } = await getModelFromProvider()
    if (!embeddingModel) {
      throw new ConfigurationError(ErrorCode.CONFIG_MISSING_EMBEDDING_MODEL)
    }

    for (const file of input) {
      const content = await loadFileContent(file)
      const splitter = getSplitter(content)
      const chunks = await splitter.splitText(content)
      await createResource({ content, chunks }, { model: embeddingModel })
    }

    return { success: true }
  })

export const list = os
  .input(
    z.object({
      page: z.number().gt(0),
      pageSize: z.number().gt(0)
    })
  )
  .handler(async ({ input }) => {
    return await getResourcePaginated(input.page, input.pageSize)
  })
