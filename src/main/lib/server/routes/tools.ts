import { Variables } from '@shared/types/server'
import { BrowserWindow } from 'electron'
import { Hono } from 'hono'
import MarkdownIt from 'markdown-it'
import { markdownToPdfSchema } from '../schemas'

const tools = new Hono<{ Variables: Variables }>()

async function markdownStringToPdfBuffer(markdownString: string) {
  const md = new MarkdownIt()
  const html = md.render(markdownString)

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  try {
    await win.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
    )
    const buffer = await win.webContents.printToPDF({
      pageSize: 'A4'
    })
    return buffer
  } catch (e) {
    throw e instanceof Error ? e.message : new Error(`Failed to generate PDF`)
  } finally {
    win.close()
  }
}

tools.post('/md-to-pdf', async (c) => {
  const result = markdownToPdfSchema.safeParse(await c.req.json())
  if (!result.success) {
    return c.text('Invalid request body', 400)
  }
  const { markdown } = result.data
  const buffer = await markdownStringToPdfBuffer(markdown)
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
