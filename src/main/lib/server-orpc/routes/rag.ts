import { os } from '@orpc/server'
import z from 'zod'
import { getSplitter, loadFileContent } from '../../ai/rag'
import { getModelFromProvider } from '../../ai/utils/chat-message-util'
import {
  createResource,
  findRelevantContent,
  getResourcePaginated
} from '../../db/queries'

export const findRelevant = os
  .input(
    z.object({
      question: z.string()
    })
  )
  .handler(async ({ input }) => {
    const { embeddingModel } = await getModelFromProvider()
    if (!embeddingModel) return

    return await findRelevantContent(
      { userQuery: input.question },
      { model: embeddingModel }
    )
  })

export const embeddingFiles = os
  .input(z.array(z.instanceof(File)))
  .handler(async ({ input }) => {
    const { embeddingModel } = await getModelFromProvider()
    if (!embeddingModel) return
    for (const file of input) {
      const content = await loadFileContent(file)
      const splitter = getSplitter(content)
      const chunks = await splitter.splitText(content)
      await createResource({ content, chunks }, { model: embeddingModel })
    }
  })

export const embeddingList = os
  .input(
    z.object({
      page: z.number().gt(0),
      pageSize: z.number().gt(0)
    })
  )
  .handler(async ({ input }) => {
    return await getResourcePaginated(input.page, input.pageSize)
  })
