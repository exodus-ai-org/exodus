import { Variables } from '@shared/types/server'
import { BrowserWindow } from 'electron'
import { Hono } from 'hono'
import MarkdownIt from 'markdown-it'

const tools = new Hono<{ Variables: Variables }>()

async function markdownStringToPdfBuffer(markdownString: string) {
  const md = new MarkdownIt()
  const html = md.render(markdownString)

  const win = new BrowserWindow({
    show: false, // Don't show the window
    webPreferences: {
      nodeIntegration: false, // Recommended for security
      contextIsolation: true // Recommended for security
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
  const { markdown } = await c.req.json()
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
