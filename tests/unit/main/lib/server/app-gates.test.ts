// The gates as createApp() really stacks them (final review M2): the unit
// tests of chat-approval and presence-gate assemble their own Hono stacks, so
// only this one notices presenceGate dropped from app.ts or moved.
import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: () => '/tmp', isPackaged: false, getVersion: () => '0.0.0' },
  safeStorage: { isEncryptionAvailable: () => false },
  BrowserWindow: class {},
  ipcMain: { handle: vi.fn(), on: vi.fn() },
  nativeTheme: {},
  shell: {},
  net: {}
}))
vi.mock('@main/lib/db/db', () => ({ pglite: {}, db: {} }))
vi.mock('@main/lib/db/queries', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSettings: vi.fn(async () => ({ id: 'settings-1' }))
}))

const { createApp } = await import('@main/lib/server/app')

describe('createApp() — the presence gate is in the real stack', () => {
  const app = createApp()

  it('POST /api/v1/chat/approval without the presence token → 403 on loopback', async () => {
    const res = await app.request('/api/v1/chat/approval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId: 'r', toolCallId: 't', decision: 'allow' })
    })
    expect(res.status).toBe(403)
    expect(JSON.stringify(await res.json())).toContain('PRESENCE_REQUIRED')
  })

  it('/api/v1/devices without the presence token → 403 on loopback', async () => {
    const res = await app.request('/api/v1/devices')
    expect(res.status).toBe(403)
    expect(JSON.stringify(await res.json())).toContain('PRESENCE_REQUIRED')
  })

  it('with the token the same request gets past the gate', async () => {
    const { getPresenceToken, PRESENCE_HEADER } =
      await import('@main/lib/presence')
    const res = await app.request('/api/v1/chat/approval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [PRESENCE_HEADER]: getPresenceToken()
      },
      body: JSON.stringify({ runId: 'r', toolCallId: 't', decision: 'allow' })
    })
    // Nothing is waiting under that id: the route itself answers.
    expect(res.status).toBe(404)
  })
})
