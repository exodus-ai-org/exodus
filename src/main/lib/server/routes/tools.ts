import { Variables } from '@shared/types/server'
import { BrowserWindow } from 'electron'
import { Hono } from 'hono'
import MarkdownIt from 'markdown-it'
import { ChatSDKError } from '../errors'
import { markdownToPdfSchema } from '../schemas/tools'
import { getRequiredQuery, successResponse, validateSchema } from '../utils'
import { bufferToArrayBuffer } from '../utils/helpers'

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
    throw new ChatSDKError(
      'bad_request:api',
      e instanceof Error ? e.message : 'Failed to generate PDF'
    )
  } finally {
    win.close()
  }
}

tools.post('/md-to-pdf', async (c) => {
  const { markdown } = validateSchema(
    markdownToPdfSchema,
    await c.req.json(),
    'api',
    'Invalid request body'
  )

  const buffer = await markdownStringToPdfBuffer(markdown)

  return new Response(bufferToArrayBuffer(buffer), {
    headers: {
      'Content-Type': 'application/pdf'
    }
  })
})

tools.get('/ping-ollama', async (c) => {
  const url = getRequiredQuery(c, 'url', 'api')

  try {
    await fetch(url)
    return successResponse(c, {
      message: 'Ollama is running'
    })
  } catch {
    throw new ChatSDKError('not_found:api', 'Ollama is not reachable')
  }
})

export default tools
