// Re-review S2 N1: an MCP server whose url / args (or any secret) would not
// decrypt must never be connected — its url reads as null and its args as
// [], and connecting that used to fall back to stdio with whatever command
// the row still had (a bare interpreter reading JSON-RPC as a script, a
// shell running it as commands). The rows here come from the real decrypt
// path (fake safeStorage); the SDK transports and client are mocked, so
// nothing is ever spawned or dialled.
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fakeSafeStorageState,
  resetFakeSafeStorage
} from '../../../helpers/fake-safe-storage'

vi.mock('electron', async () => {
  const { fakeSafeStorage } = await import('../../../helpers/fake-safe-storage')
  return { app: { getPath: () => '/tmp' }, safeStorage: fakeSafeStorage }
})
const logged = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
}))
vi.mock('@main/lib/logger', () => ({ logger: logged }))

const transports = vi.hoisted(() => ({
  stdio: vi.fn(),
  http: vi.fn(),
  sse: vi.fn()
}))
vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: transports.stdio
}))
vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: transports.http
}))
vi.mock('@modelcontextprotocol/sdk/client/sse.js', () => ({
  SSEClientTransport: transports.sse
}))
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn().mockImplementation(function () {
    return {
      connect: vi.fn(async () => {}),
      listTools: vi.fn(async () => ({ tools: [] })),
      close: vi.fn(async () => {})
    }
  })
}))

const rows = vi.hoisted(() => ({ list: [] as unknown[] }))
vi.mock('@main/lib/db/philharmonic-queries', () => ({
  getAllMcpServers: vi.fn(async () => rows.list),
  getMcpServersByNames: vi.fn(async (names: string[]) =>
    (rows.list as Array<{ name: string }>).filter((r) => names.includes(r.name))
  )
}))

const { decryptMcpRow, encryptMcpSecrets } =
  await import('@main/lib/secrets/at-rest')
const mcp = await import('@main/lib/ai/mcp')

let n = 0
/** A row as stored (sealed), then read back through the real decrypt. */
function stored(row: Record<string, unknown>) {
  n++
  return encryptMcpSecrets({
    id: `id-${n}`,
    name: `server-${n}`,
    description: '',
    isActive: true,
    env: null,
    headers: null,
    extraConfig: null,
    url: null,
    args: [],
    command: '',
    transportType: 'stdio',
    ...row
  } as never).sealed as Record<string, unknown>
}
const read = (sealed: Record<string, unknown>) =>
  decryptMcpRow(sealed as never).plain

beforeEach(async () => {
  resetFakeSafeStorage()
  for (const t of Object.values(transports)) t.mockClear()
  for (const f of Object.values(logged)) f.mockClear()
  await mcp.invalidateAllMcpCache()
})

describe('an MCP server whose stored values will not decrypt', () => {
  it('is not connected when its args are lost (bare interpreter)', async () => {
    const sealed = stored({ command: 'node', args: ['server.js', '--x'] })
    fakeSafeStorageState.machine = 'machine-B'
    rows.list = [read(sealed)]
    expect(await mcp.getMcpTools()).toEqual([])
    expect(transports.stdio).not.toHaveBeenCalled()
    expect(JSON.stringify(logged.warn.mock.calls)).toContain('args')
  })

  it('is not connected when its url is lost, even with a stale command', async () => {
    const sealed = stored({
      transportType: 'streamable-http',
      url: 'https://mcp.example.com/sse',
      command: 'bash',
      args: ['-c', 'x']
    })
    fakeSafeStorageState.machine = 'machine-B'
    rows.list = [read(sealed)]
    expect(await mcp.getMcpTools()).toEqual([])
    expect(
      await mcp.getMcpToolsByNames([(rows.list[0] as { name: string }).name])
    ).toEqual([])
    for (const t of Object.values(transports)) expect(t).not.toHaveBeenCalled()
  })

  it('is not connected when only a header secret is lost', async () => {
    const sealed = stored({
      transportType: 'sse',
      url: 'https://mcp.example.com/sse',
      headers: { Authorization: 'Bearer lost-token-00000000' }
    })
    // The url is readable (another value only would not be): lose just the header.
    const plainUrl = read(sealed).url
    fakeSafeStorageState.machine = 'machine-B'
    const row = { ...read(sealed), url: plainUrl }
    rows.list = [row]
    expect(await mcp.getMcpTools()).toEqual([])
    expect(transports.sse).not.toHaveBeenCalled()
  })

  it('a readable server next to it still connects', async () => {
    const good = read(stored({ command: 'uvx', args: ['mcp-server-time'] }))
    const lost = stored({ command: 'node', args: ['s.js'] })
    fakeSafeStorageState.machine = 'machine-B'
    rows.list = [good, read(lost)]
    // `good` was decrypted before the switch, so it is intact.
    const tools = await mcp.getMcpTools()
    expect(tools.map((t) => t.mcpServerName)).toEqual([
      (good as { name: string }).name
    ])
    expect(transports.stdio).toHaveBeenCalledTimes(1)
  })
})

describe('createTransport refuses what it cannot run as configured', () => {
  const base = {
    id: 'x',
    name: 'x',
    env: null,
    headers: null,
    args: [],
    command: 'npx',
    url: null
  }

  it.each(['streamable-http', 'sse'])(
    'never falls back to stdio for a %s server without a url',
    (transportType) => {
      expect(() =>
        mcp.createTransport({ ...base, transportType } as never)
      ).toThrow(/url/iu)
      expect(transports.stdio).not.toHaveBeenCalled()
    }
  )

  it('refuses an empty stdio command', () => {
    expect(() =>
      mcp.createTransport({
        ...base,
        transportType: 'stdio',
        command: '  '
      } as never)
    ).toThrow(/command/iu)
    expect(transports.stdio).not.toHaveBeenCalled()
  })

  it('refuses an unknown transport', () => {
    expect(() =>
      mcp.createTransport({ ...base, transportType: 'ws' } as never)
    ).toThrow(/transport/iu)
  })

  it('builds stdio from a real command', () => {
    mcp.createTransport({ ...base, transportType: 'stdio' } as never)
    expect(transports.stdio).toHaveBeenCalledTimes(1)
  })
})
