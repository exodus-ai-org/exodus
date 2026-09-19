// src/main/lib/analytics/snapshot.ts (+ duckdb.ts through a real DuckDB)
//
// Runs the real @duckdb/node-api under vitest against a temp analytics dir:
// builds a snapshot from fixture rows (PGlite is mocked out — `source` is
// injected), then executes every Chat Audit preset against it. A preset that
// references a column the snapshot doesn't have fails here, not in the UI.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import { CHAT_AUDIT_PRESETS } from '@exodus/shared/constants/chat-audit-presets'
import { afterAll, describe, expect, it, vi } from 'vitest'

const root = mkdtempSync(join(tmpdir(), 'exodus-analytics-'))
const analyticsDir = join(root, 'analytics')
const logsDir = join(root, 'logs')
mkdirSync(analyticsDir, { recursive: true })
mkdirSync(logsDir, { recursive: true })

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@main/lib/db/db', () => ({ db: {}, pglite: {} }))
vi.mock('@main/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))
vi.mock('@main/lib/paths', () => ({
  getAnalyticsDir: () => analyticsDir,
  getAnalyticsDbPath: () => join(analyticsDir, 'exodus.duckdb'),
  getLogsDir: () => logsDir
}))

const now = new Date('2026-09-19T10:00:00.000Z')
const usage = {
  input: 120,
  output: 40,
  cacheRead: 10,
  cacheWrite: 0,
  totalTokens: 170,
  cost: {
    input: 0.001,
    output: 0.002,
    cacheRead: 0,
    cacheWrite: 0,
    total: 0.003
  }
}

const source = async () => ({
  projects: [
    {
      id: 'p1',
      name: 'Work',
      description: 'desc',
      createdAt: now,
      updatedAt: now
    }
  ],
  chats: [
    {
      id: 'c1',
      title: 'Hello',
      favorite: true,
      projectId: 'p1',
      projectName: 'Work',
      createdAt: now
    },
    {
      id: 'c2',
      title: 'Second',
      favorite: null,
      projectId: null,
      projectName: null,
      createdAt: now
    }
  ],
  messages: [
    {
      id: 'm1',
      chatId: 'c1',
      role: 'user',
      provider: null,
      model: null,
      api: null,
      stopReason: null,
      errorMessage: null,
      toolName: null,
      toolCallId: null,
      isError: null,
      searchText: 'hi there keyword',
      usage: null,
      durationMs: null,
      createdAt: now,
      content: [{ type: 'text', text: 'hi there keyword' }]
    },
    {
      id: 'm2',
      chatId: 'c1',
      role: 'assistant',
      provider: 'anthropic',
      model: 'claude-x',
      api: 'anthropic-messages',
      stopReason: 'stop',
      errorMessage: null,
      toolName: null,
      toolCallId: null,
      isError: null,
      searchText: 'hello!',
      usage,
      durationMs: 1200,
      createdAt: now,
      content: [{ type: 'text', text: 'hello!' }]
    },
    {
      id: 'm3',
      chatId: 'c1',
      role: 'toolResult',
      provider: null,
      model: null,
      api: null,
      stopReason: null,
      errorMessage: null,
      toolName: 'weather',
      toolCallId: 'call-1',
      isError: false,
      searchText: null,
      usage: null,
      durationMs: null,
      createdAt: now,
      content: { ok: true }
    }
  ]
})

afterAll(async () => {
  const { closeDuckDB } = await import('@main/lib/analytics/duckdb')
  closeDuckDB()
  rmSync(root, { recursive: true, force: true })
})

describe('snapshot row mappers', () => {
  it('flattens usage into typed columns and ISO timestamps', async () => {
    const { toMessageRow, toChatRow } =
      await import('@main/lib/analytics/snapshot')
    const rows = await source()
    const m = toMessageRow(rows.messages[1])
    expect(m).toMatchObject({
      id: 'm2',
      chat_id: 'c1',
      role: 'assistant',
      input_tokens: 120,
      output_tokens: 40,
      cache_read_tokens: 10,
      total_tokens: 170,
      cost_usd: 0.003,
      duration_ms: 1200,
      created_at: '2026-09-19T10:00:00.000Z'
    })
    expect(toMessageRow(rows.messages[0]).input_tokens).toBeNull()
    expect(toChatRow(rows.chats[1])).toMatchObject({
      favorite: false,
      project_id: null,
      project_name: null
    })
  })

  it('emits typed DDL for empty tables and read_json with columns otherwise', async () => {
    const { loadTableSql, CHAT_COLUMNS } =
      await import('@main/lib/analytics/snapshot')
    expect(loadTableSql('chats', '/x.ndjson', CHAT_COLUMNS, 0)).toBe(
      'CREATE OR REPLACE TABLE chats (id VARCHAR, title VARCHAR, favorite BOOLEAN, project_id VARCHAR, project_name VARCHAR, created_at TIMESTAMP)'
    )
    const sql = loadTableSql('chats', "/it's.ndjson", CHAT_COLUMNS, 3)
    expect(sql).toContain("read_json('/it''s.ndjson'")
    expect(sql).toContain("'created_at': 'TIMESTAMP'")
  })
})

describe('buildSnapshot + runQuery (real DuckDB)', () => {
  it('builds the file, exposes the logs view, and runs every preset', async () => {
    writeFileSync(
      join(logsDir, '2026-09-19.jsonl'),
      JSON.stringify({
        timestamp: '2026-09-19T07:34:02.819Z',
        severityNumber: 9,
        severityText: 'INFO',
        body: 'hello',
        scope: { name: 'mcp' },
        attributes: { name: 'x' },
        resource: { 'service.name': 'exodus' },
        traceId: 't1'
      }) + '\n'
    )
    const { buildSnapshot, readSnapshotMeta } =
      await import('@main/lib/analytics/snapshot')
    const { runQuery, MAX_RESULT_ROWS } =
      await import('@main/lib/analytics/duckdb')

    const meta = await buildSnapshot({ source })
    expect(meta.tables).toEqual([
      { name: 'chats', rows: 2 },
      { name: 'messages', rows: 3 },
      { name: 'projects', rows: 1 }
    ])
    expect(meta.logsIncluded).toBe(true)
    expect(meta.sizeBytes).toBeGreaterThan(0)
    expect((await readSnapshotMeta())?.builtAt).toBe(meta.builtAt)

    const count = await runQuery('select count(*) as n from messages')
    expect(count.rows[0].n).toBe(3) // BigInt → JSON number
    expect(count.columns[0]).toEqual({ name: 'n', type: 'BIGINT' })

    const logs = await runQuery(
      'select scope.name as s, count(*) as n from logs group by all'
    )
    expect(logs.rows).toEqual([{ s: 'mcp', n: 1 }])

    for (const preset of CHAT_AUDIT_PRESETS) {
      await expect(runQuery(preset.sql), preset.id).resolves.toBeTruthy()
    }

    const big = await runQuery(`select * from range(${MAX_RESULT_ROWS + 50})`)
    expect(big.truncated).toBe(true)
    expect(big.rowCount).toBe(MAX_RESULT_ROWS)

    // Read-only: the console cannot mutate the snapshot.
    await expect(runQuery('delete from messages')).rejects.toThrow(/read-only/i)
    await expect(runQuery('select nope from messages')).rejects.toThrow(/nope/)
  }, 60_000)
})
