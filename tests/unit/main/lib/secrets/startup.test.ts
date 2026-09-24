// The secrets startup pass, step by step (re-review S2 N2 and the deferred
// minors): each step fails on its own (a denied Keychain prompt does not skip
// stripping job keys), the strip reports how many payloads it changed, the
// raw `~/.exodus/logs/*.jsonl` are scrubbed of every current secret during
// the one-time purge, and an envelope self-check that fails (a future
// Electron with another OSCrypt tag) turns encryption off rather than
// re-wrapping and purging on every launch. In-memory PGlite with pgmq; the
// marker and the logs live in a temp dir; safeStorage is faked.
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fakeSafeStorageState,
  resetFakeSafeStorage
} from '../../../helpers/fake-safe-storage'

const root = mkdtempSync(join(tmpdir(), 'exodus-startup-'))
const logsDir = join(root, 'logs')
const marker = join(root, 'secrets-purge.json')

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
vi.mock('@main/lib/paths', () => ({
  getSecretsPurgeMarkerPath: () => join(root, 'secrets-purge.json'),
  getLogsDir: () => join(root, 'logs')
}))
vi.mock('@main/lib/db/db', async () => {
  const { drizzle } = await import('drizzle-orm/pglite')
  const { createMigratedPglite } =
    await import('../../../helpers/migrated-pglite')
  const pglite = await createMigratedPglite('0009', { pgmq: true })
  for (const q of ['lcm-post-turn', 'memory-consolidate']) {
    await pglite.exec(`SELECT pgmq.create('${q}');`)
  }
  return { pglite, db: drizzle(pglite) }
})

const { pglite } = await import('@main/lib/db/db')
const { invalidateSettingsCache } = await import('@main/lib/db/queries')
const { secretsAtRestStartup } = await import('@main/lib/secrets/migrate')
const { ENC_PREFIX, encryptionState, resetEncryptionWarning } =
  await import('@main/lib/secrets/crypto')
const { stripApiKeysFromQueuedJobs } = await import('@main/lib/jobs/queries')

afterAll(async () => {
  await pglite.close()
  rmSync(root, { recursive: true, force: true })
})

const OPENAI = 'sk-proj-startup-openai-1a2b3c4d5e6f'
const JOB_KEY = 'sk-startup-queued-key-9z8y7x6w'
const CAP = 'Cap9f8e7d6c5b4a3210ABCDEFghij'
const ARG_KEY = 'startup-arg-key-5d4c3b2a'

async function seed() {
  await pglite.exec(`
    DELETE FROM settings; DELETE FROM mcp_server;
    DELETE FROM pgmq."q_lcm-post-turn"; DELETE FROM pgmq."q_memory-consolidate";`)
  await pglite.query(
    `INSERT INTO settings (id, providers) VALUES ('global', $1)`,
    [JSON.stringify({ openaiApiKey: OPENAI })]
  )
  await pglite.query(
    `INSERT INTO mcp_server (name, "transportType", url, command, args)
     VALUES ('m', 'streamable-http', $1, 'npx', $2)`,
    [
      `https://mcp.example.com/${CAP}/sse`,
      JSON.stringify(['-y', 'pkg', `--api-key=${ARG_KEY}`])
    ]
  )
  invalidateSettingsCache()
}

async function queue(payload: object, q = 'lcm-post-turn') {
  await pglite.query(`SELECT pgmq.send($1, $2::jsonb)`, [
    q,
    JSON.stringify(payload)
  ])
}

async function queued(): Promise<string> {
  const r = await pglite.query(
    `SELECT message FROM pgmq."q_lcm-post-turn"
     UNION ALL SELECT message FROM pgmq."q_memory-consolidate"`
  )
  return JSON.stringify(r.rows)
}

beforeEach(async () => {
  resetFakeSafeStorage()
  resetEncryptionWarning()
  for (const f of Object.values(logged)) f.mockClear()
  rmSync(marker, { force: true })
  rmSync(logsDir, { recursive: true, force: true })
  mkdirSync(logsDir, { recursive: true })
  await seed()
})

describe('stripApiKeysFromQueuedJobs', () => {
  it('counts the payloads it changed, across queues', async () => {
    await queue({ chatId: 'a', apiKey: JOB_KEY })
    await queue({ chatId: 'b', apiKey: JOB_KEY }, 'memory-consolidate')
    await queue({ chatId: 'c' })
    expect(await stripApiKeysFromQueuedJobs()).toBe(2)
    expect(await queued()).not.toContain(JOB_KEY)
    expect(await stripApiKeysFromQueuedJobs()).toBe(0)
  })
})

describe('each startup step stands on its own (N2)', () => {
  it('a denied Keychain prompt still strips job keys and vacuums them — no marker', async () => {
    await queue({ chatId: 'a', apiKey: JOB_KEY })
    fakeSafeStorageState.denyEncrypt = true

    const result = await secretsAtRestStartup()
    expect(result.encryptFailed).toBe(true)
    expect(result.jobs).toBe(1)
    expect(result.purged).toBe(true)
    expect(await queued()).not.toContain(JOB_KEY)
    // The plaintext rows could not be encrypted; the first launch that can
    // encrypt them purges again (it changes them), so no marker yet.
    expect(existsSync(marker)).toBe(false)
    expect(JSON.stringify(logged.error.mock.calls)).not.toContain(OPENAI)

    fakeSafeStorageState.denyEncrypt = false
    const next = await secretsAtRestStartup()
    expect(next.encryptFailed).toBe(false)
    expect(next.settings).toBe(1)
    expect(next.purged).toBe(true)
    expect(existsSync(marker)).toBe(true)
  })

  it('a failing strip does not stop encryption or the purge', async () => {
    await pglite.exec(
      `ALTER TABLE pgmq."q_lcm-post-turn" RENAME TO "q_lcm-post-turn_x"`
    )
    await pglite.exec(
      `CREATE VIEW pgmq."q_lcm-post-turn" AS SELECT 1 AS message`
    )
    try {
      const result = await secretsAtRestStartup()
      expect(result.stripFailed).toBe(true)
      expect(result.settings).toBe(1)
      expect(result.purged).toBe(true)
    } finally {
      await pglite.exec(`DROP VIEW pgmq."q_lcm-post-turn"`)
      await pglite.exec(
        `ALTER TABLE pgmq."q_lcm-post-turn_x" RENAME TO "q_lcm-post-turn"`
      )
    }
  })
})

describe('the raw log files are scrubbed during the purge', () => {
  it('replaces every current secret, MCP url / args ones included, and leaves the rest', async () => {
    const leaky = join(logsDir, '2026-09-20.jsonl')
    const clean = join(logsDir, '2026-09-21.jsonl')
    const lines = [
      { body: `Failed query params: ${OPENAI}` },
      {
        body: 'connect',
        attributes: { url: `https://mcp.example.com/${CAP}/sse` }
      },
      { body: `spawn npx -y pkg --api-key=${ARG_KEY}` },
      { body: 'nothing to see' }
    ]
    writeFileSync(leaky, lines.map((l) => JSON.stringify(l)).join('\n') + '\n')
    writeFileSync(clean, JSON.stringify({ body: 'ok' }) + '\n')

    const result = await secretsAtRestStartup()
    expect(result.logsScrubbed).toBe(1)
    const text = readFileSync(leaky, 'utf8')
    for (const s of [OPENAI, CAP, ARG_KEY]) expect(text).not.toContain(s)
    expect(text).toContain('nothing to see')
    expect(text.split('\n').filter(Boolean)).toHaveLength(4)
    for (const line of text.split('\n').filter(Boolean)) JSON.parse(line)
    expect(readFileSync(clean, 'utf8')).toBe(
      JSON.stringify({ body: 'ok' }) + '\n'
    )
  })

  it('does not rescrub on a launch that purges nothing', async () => {
    await secretsAtRestStartup()
    const later = join(logsDir, '2026-09-22.jsonl')
    writeFileSync(later, JSON.stringify({ body: OPENAI }) + '\n')
    const result = await secretsAtRestStartup()
    expect(result.purged).toBe(false)
    expect(result.logsScrubbed).toBe(0)
  })
})

describe('the envelope self-check', () => {
  it('a backend whose blobs are not recognizable envelopes counts as unavailable', async () => {
    fakeSafeStorageState.tag = 'v99'
    expect(encryptionState()).toBe('unavailable')

    const first = await secretsAtRestStartup()
    expect(first.settings).toBe(0)
    const [row] = (await pglite.query(`SELECT providers FROM settings`))
      .rows as Array<{
      providers: { openaiApiKey: string }
    }>
    expect(row!.providers.openaiApiKey).toBe(OPENAI)
    expect(row!.providers.openaiApiKey.startsWith(ENC_PREFIX)).toBe(false)
    await vi.waitFor(() =>
      expect(JSON.stringify(logged.error.mock.calls)).toMatch(/self-check/iu)
    )
    // No re-wrapping, so nothing to purge on the next launch.
    expect((await secretsAtRestStartup()).purged).toBe(false)
  })
})
