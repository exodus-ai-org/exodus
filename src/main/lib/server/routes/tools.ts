import { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import { mdToPdf } from 'md-to-pdf'

const tools = new Hono<{ Variables: Variables }>()

tools.post('/md-to-pdf', async (c) => {
  const { markdown } = await c.req.json()
  const { content } = await mdToPdf({ content: markdown })

  const buffer = Buffer.from(
    content.buffer.slice(
      content.byteOffset,
      content.byteOffset + content.byteLength
    )
  )
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf'
    }
  })
})

tools.get('/ping-ollama', async (c) => {
  const url = c.req.query('url')
  if (!url) {
    return c.text('Not Found', 404)
  }

  try {
    await fetch(url)
    return c.json({
      message: 'Ollama is running'
    })
  } catch {
    return c.text('Not Found', 404)
  }
})

export default tools
