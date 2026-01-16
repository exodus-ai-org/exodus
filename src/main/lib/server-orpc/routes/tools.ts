import { os } from '@orpc/server'
import { ErrorCode } from '@shared/constants/error-codes'
import { FileError, ServiceError } from '@shared/errors'
import { BrowserWindow } from 'electron'
import MarkdownIt from 'markdown-it'
import z from 'zod'

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
    throw new FileError(
      ErrorCode.PDF_GENERATION_FAILED,
      e instanceof Error ? e.message : 'Failed to generate PDF'
    )
  } finally {
    win.close()
  }
}

export const markdownToPdf = os
  .input(
    z.object({
      markdown: z.string()
    })
  )
  .handler(async ({ input }) => {
    const buffer = await markdownStringToPdfBuffer(input.markdown)
    return buffer
  })

export const pingOllama = os
  .input(
    z.object({
      url: z.string().url()
    })
  )
  .handler(async ({ input }) => {
    try {
      await fetch(input.url)
      return {
        message: 'Ollama is running'
      }
    } catch {
      throw new ServiceError(ErrorCode.SERVICE_OLLAMA_UNREACHABLE, undefined, {
        url: input.url
      })
    }
  })
