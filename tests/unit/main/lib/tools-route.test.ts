// The PDF export's print window: its page is a data: URL whose every picture
// is inline, so the window lives in its own session and fetches nothing else.
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Filter = (
  details: { url: string },
  callback: (response: { cancel: boolean }) => void
) => void

const windows: Array<{ options: Record<string, unknown>; loaded?: string }> = []
const filters: Record<string, Filter> = {}

vi.mock('electron', () => ({
  BrowserWindow: class {
    record: { options: Record<string, unknown>; loaded?: string }
    webContents = {
      printToPDF: () => Promise.resolve(Buffer.from('%PDF'))
    }
    constructor(options: Record<string, unknown>) {
      this.record = { options }
      windows.push(this.record)
    }
    loadURL(url: string) {
      this.record.loaded = url
      return Promise.resolve()
    }
    close() {}
  },
  session: {
    fromPartition: (partition: string) => ({
      webRequest: {
        onBeforeRequest: (filter: Filter) => {
          filters[partition] = filter
        }
      }
    })
  }
}))

const { default: tools } = await import('@main/lib/server/routes/tools')

const cancelled = (filter: Filter, url: string) => {
  let answer: boolean | undefined
  filter({ url }, ({ cancel }) => {
    answer = cancel
  })
  return answer
}

beforeEach(() => {
  windows.length = 0
  for (const key of Object.keys(filters)) delete filters[key]
})

describe('POST /md-to-pdf', () => {
  it('prints in its own session, which cancels every request but data:', async () => {
    const response = await tools.request('/md-to-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown: '# Report' })
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')

    expect(windows).toHaveLength(1)
    const webPreferences = windows[0]!.options.webPreferences as Record<
      string,
      unknown
    >
    expect(webPreferences.partition).toBe('print-export')
    expect(windows[0]!.loaded?.startsWith('data:text/html')).toBe(true)

    const filter = filters['print-export']!
    expect(filter).toBeDefined()
    expect(cancelled(filter, 'data:image/png;base64,iVBORw0KGgo=')).toBe(false)
    expect(cancelled(filter, 'https://attacker.example/p.png')).toBe(true)
    expect(cancelled(filter, 'file:///etc/passwd')).toBe(true)
  })
})
