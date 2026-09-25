// The Maps JS key over IPC (`maps:js-key`, ipc.ts): handed only to the main
// window's own top frame, like the presence token — never to a sub-app, an
// embedded frame, or over the API (final review I5).
import { beforeAll, describe, expect, it, vi } from 'vitest'

const handlers = new Map<string, (...args: unknown[]) => unknown>()
vi.mock('electron', () => ({
  app: { getPath: () => '/tmp', isPackaged: false },
  BrowserWindow: class {},
  ipcMain: {
    handle: (channel: string, fn: (...args: unknown[]) => unknown) =>
      handlers.set(channel, fn),
    on: vi.fn()
  },
  nativeTheme: {},
  shell: {}
}))
const mainFrame = { id: 'main-frame' }
const mainContents = { mainFrame }
vi.mock('@main/lib/window', () => ({
  closeSearchBar: vi.fn(),
  getMainWindow: () => ({ webContents: mainContents }),
  getQuickChatView: vi.fn(),
  setQuickChatView: vi.fn()
}))
vi.mock('@main/lib/db/queries', () => ({
  getSettings: vi.fn(async () => ({
    googleCloud: { googleApiKey: 'AIzaSyREALKEY0123456789' }
  }))
}))
vi.mock('@main/lib/auto-updater', () => ({
  updaterCheck: vi.fn(),
  updaterDownload: vi.fn(),
  updaterGetState: vi.fn(),
  updaterInstall: vi.fn(),
  updaterSetAutoDownload: vi.fn()
}))
vi.mock('@main/lib/lock/ipc', () => ({ setupLockIPC: vi.fn() }))
vi.mock('@main/lib/tray', () => ({ destroyTray: vi.fn(), setTray: vi.fn() }))
vi.mock('@main/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))

beforeAll(async () => {
  const { setupIPC } = await import('@main/lib/ipc')
  setupIPC()
})

const invoke = (event: unknown) =>
  (handlers.get('maps:js-key') as (e: unknown) => Promise<unknown>)(event)

describe('maps:js-key', () => {
  it("answers the main window's top frame with the key", async () => {
    await expect(
      invoke({ sender: mainContents, senderFrame: mainFrame })
    ).resolves.toBe('AIzaSyREALKEY0123456789')
  })

  it('refuses another webContents (a sub-app)', async () => {
    await expect(
      invoke({ sender: { mainFrame: {} }, senderFrame: mainFrame })
    ).resolves.toBeNull()
  })

  it('refuses an embedded frame of the main window', async () => {
    await expect(
      invoke({ sender: mainContents, senderFrame: { id: 'iframe' } })
    ).resolves.toBeNull()
  })
})
