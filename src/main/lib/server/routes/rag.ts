import { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import { getSplitter, loadFileContent } from '../../ai/rag'
import { getModelFromProvider } from '../../ai/utils/chat-message-util'
import { db } from '../../db/db'
import {
  createResource,
  findRelevantContent,
  getResourcePaginated
} from '../../db/queries'
import { embedding } from '../../db/schema'

const rag = new Hono<{ Variables: Variables }>()

rag.post('/retrieve', async (c) => {
  const { embeddingModel } = await getModelFromProvider()
  if (!embeddingModel) {
    return c.text(
      'The embedding model is missing, please check your settings',
      400
    )
  }

  const { question } = await c.req.json()
  const result = await findRelevantContent(
    { userQuery: question },
    { model: embeddingModel }
  )

  return c.json(result)
})

rag.post('/', async (c) => {
  const formData = await c.req.formData()
  const { embeddingModel } = await getModelFromProvider()

  if (!embeddingModel) {
    return c.text(
      'The embedding model is missing, please check your settings',
      400
    )
  }

  const files = formData.getAll('files') as File[]
  for (const file of files) {
    const content = await loadFileContent(file)
    const splitter = getSplitter(content)
    const chunks = await splitter.splitText(content)
    await createResource({ content, chunks }, { model: embeddingModel })
  }

  return c.json({ success: true })
})

rag.get('/', async (c) => {
  const page = Number(c.req.query('page') ?? '1')
  const pageSize = Number(c.req.query('pageSize') ?? '10')

  const result = await getResourcePaginated(page, pageSize)
  return c.json(result)
})

rag.get('/embedding', async (c) => {
  const result = await db.select().from(embedding)
  return c.json(result)
})

export default rag
