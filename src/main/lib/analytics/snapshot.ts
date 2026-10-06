import { existsSync, readdirSync, statSync } from 'fs'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'

import type { DuckDBConnection } from '@duckdb/node-api'
import type { Usage } from '@earendil-works/pi-ai'
import { CHAT_AUDIT_SCHEMA } from '@exodus/shared/constants/chat-audit-schema'
import type { SnapshotMeta } from '@exodus/shared/types/analytics'

import { db } from '../db/db'
import { chat, message } from '../db/schema'
import { logger } from '../logger'
import { getAnalyticsDbPath, getAnalyticsDir, getLogsDir } from '../paths'
import { scrubSecrets } from '../secrets/scrub'
import { closeDuckDB, withReadWrite } from './duckdb'

/**
 * Copies chats / messages out of PGlite into the DuckDB file the
 * Chat Audit console queries, plus a `logs` table copied from the JSONL log
 * files. Rows are staged as NDJSON and loaded with `read_json(..., columns)`
 * so every column has an explicit type (no inference surprises on an empty
 * or all-null column), then the staging files are deleted.
 */

const META_FILE = 'snapshot.json'

export interface ChatSource {
  id: string
  title: string
  favorite: boolean | null
  createdAt: Date
}

export interface MessageSource {
  id: string
  chatId: string
  role: string
  provider: string | null
  model: string | null
  api: string | null
  stopReason: string | null
  errorMessage: string | null
  toolName: string | null
  toolCallId: string | null
  isError: boolean | null
  searchText: string | null
  usage: Usage | null
  durationMs: number | null
  createdAt: Date
  content: unknown
}

export interface SourceRows {
  chats: ChatSource[]
  messages: MessageSource[]
}

// ─── Row mappers (pure, unit-tested) ─────────────────────────────────────────

// The column definitions live in the shared package so the renderer's SQL
// autocomplete and this loader can never disagree.
export const CHAT_COLUMNS = CHAT_AUDIT_SCHEMA.chats
export const MESSAGE_COLUMNS = CHAT_AUDIT_SCHEMA.messages
export const LOG_COLUMNS = CHAT_AUDIT_SCHEMA.logs

export function toChatRow(c: ChatSource) {
  return {
    id: c.id,
    title: c.title,
    favorite: c.favorite ?? false,
    created_at: c.createdAt.toISOString()
  }
}

export function toMessageRow(m: MessageSource) {
  const u = m.usage
  return {
    id: m.id,
    chat_id: m.chatId,
    role: m.role,
    provider: m.provider,
    model: m.model,
    api: m.api,
    stop_reason: m.stopReason,
    error_message: m.errorMessage,
    tool_name: m.toolName,
    tool_call_id: m.toolCallId,
    is_error: m.isError,
    text: m.searchText,
    input_tokens: u?.input ?? null,
    output_tokens: u?.output ?? null,
    cache_read_tokens: u?.cacheRead ?? null,
    cache_write_tokens: u?.cacheWrite ?? null,
    total_tokens: u?.totalTokens ?? null,
    cost_usd: u?.cost?.total ?? null,
    duration_ms: m.durationMs,
    created_at: m.createdAt.toISOString(),
    content: m.content ?? null
  }
}

// ─── SQL helpers ─────────────────────────────────────────────────────────────

export function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

export function columnsClause(columns: Record<string, string>): string {
  return `{${Object.entries(columns)
    .map(([name, type]) => `${sqlString(name)}: ${sqlString(type)}`)
    .join(', ')}}`
}

/** `CREATE OR REPLACE TABLE` from a staged NDJSON file, or an empty typed table. */
export function loadTableSql(
  table: string,
  file: string,
  columns: Record<string, string>,
  rowCount: number
): string {
  if (rowCount === 0) {
    const ddl = Object.entries(columns)
      .map(([name, type]) => `${name} ${type}`)
      .join(', ')
    return `CREATE OR REPLACE TABLE ${table} (${ddl})`
  }
  return `CREATE OR REPLACE TABLE ${table} AS SELECT * FROM read_json(${sqlString(file)}, format = 'newline_delimited', columns = ${columnsClause(columns)})`
}

/**
 * `logs` as a table copied from the JSONL files at rebuild. It used to be a
 * view over the files, but console queries run with file access disabled
 * (`duckdb.ts`), where a view that reads files fails — so the logs are as of
 * the last rebuild, like every other table. It is loaded from a staged copy
 * of the files with every current secret value masked (`stageLogs`): a line
 * logged before the secret-safe errors could quote a key, and this copy
 * outlives the log file (review S2 M3).
 */
export function logsTableSql(stagedFile: string): string {
  return `CREATE TABLE logs AS SELECT * FROM read_json(${sqlString(stagedFile)}, format = 'newline_delimited', union_by_name = true, ignore_errors = true, columns = ${columnsClause(LOG_COLUMNS)})`
}

// ─── Source ──────────────────────────────────────────────────────────────────

async function readSource(): Promise<SourceRows> {
  const [chats, messages] = await Promise.all([
    db
      .select({
        id: chat.id,
        title: chat.title,
        favorite: chat.favorite,
        createdAt: chat.createdAt
      })
      .from(chat),
    db
      .select({
        id: message.id,
        chatId: message.chatId,
        role: message.role,
        provider: message.provider,
        model: message.model,
        api: message.api,
        stopReason: message.stopReason,
        errorMessage: message.errorMessage,
        toolName: message.toolName,
        toolCallId: message.toolCallId,
        isError: message.isError,
        searchText: message.searchText,
        usage: message.usage,
        durationMs: message.durationMs,
        createdAt: message.createdAt,
        content: message.content
      })
      .from(message)
  ])
  return { chats, messages }
}

// ─── Build / status ──────────────────────────────────────────────────────────

function ndjson(rows: unknown[]): string {
  return (
    rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : '')
  )
}

function logFiles(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.jsonl'))
      .toSorted()
      .map((f) => join(dir, f))
  } catch {
    return []
  }
}

/**
 * The log files concatenated into one staging file, every current secret
 * value masked (`scrubSecrets`). False when there are no logs.
 */
async function stageLogs(
  dir: string,
  target: string,
  secrets: readonly string[]
): Promise<boolean> {
  const files = logFiles(dir)
  if (files.length === 0) return false
  const parts: string[] = []
  for (const file of files) {
    const text = await readFile(file, 'utf-8')
    parts.push(text.endsWith('\n') || text === '' ? text : `${text}\n`)
  }
  await writeFile(target, scrubSecrets(parts.join(''), secrets), 'utf-8')
  return true
}

async function currentSecrets(): Promise<string[]> {
  const { knownSecretValues } = await import('../secrets/known')
  return knownSecretValues()
}

/** Drops `logs`, whether a table or (an older snapshot's) view. */
async function dropLogs(conn: DuckDBConnection): Promise<void> {
  const views = await conn.runAndReadAll(
    "SELECT 1 FROM duckdb_views() WHERE view_name = 'logs' AND NOT internal"
  )
  await conn.run(
    views.getRowObjectsJson().length > 0
      ? 'DROP VIEW logs'
      : 'DROP TABLE IF EXISTS logs'
  )
}

export async function buildSnapshot(
  opts: {
    source?: () => Promise<SourceRows>
    /** The secret values to mask in the logs copy (default: every current one). */
    secrets?: () => Promise<string[]>
  } = {}
): Promise<SnapshotMeta> {
  const started = performance.now()
  const dir = getAnalyticsDir()
  const tmp = join(dir, 'tmp')
  await mkdir(tmp, { recursive: true })

  const rows = await (opts.source ?? readSource)()
  const staged = {
    chats: { file: join(tmp, 'chats.ndjson'), rows: rows.chats.map(toChatRow) },
    messages: {
      file: join(tmp, 'messages.ndjson'),
      rows: rows.messages.map(toMessageRow)
    }
  }
  await Promise.all(
    Object.values(staged).map((s) => writeFile(s.file, ndjson(s.rows), 'utf-8'))
  )

  const logsDir = getLogsDir()
  const stagedLogs = join(tmp, 'logs.ndjson')
  let logsIncluded = false
  try {
    // The logs table is optional (re-review S2 N3): without the current
    // secrets to scrub with, the rebuild goes on without it — never with an
    // unscrubbed copy.
    let secrets: string[] | null = null
    try {
      secrets = await (opts.secrets ?? currentSecrets)()
    } catch (err) {
      logger.warn('analytics', 'logs table skipped: secrets unreadable', {
        error: err instanceof Error ? err.name : 'unknown'
      })
    }
    const haveLogs =
      secrets !== null && (await stageLogs(logsDir, stagedLogs, secrets))
    await withReadWrite(async (conn) => {
      await conn.run(
        loadTableSql(
          'chats',
          staged.chats.file,
          CHAT_COLUMNS,
          staged.chats.rows.length
        )
      )
      await conn.run(
        loadTableSql(
          'messages',
          staged.messages.file,
          MESSAGE_COLUMNS,
          staged.messages.rows.length
        )
      )
      // A snapshot built before projects were removed still has their table.
      await conn.run('DROP TABLE IF EXISTS projects')
      // A snapshot built before `logs` became a table has it as a view.
      await dropLogs(conn)
      if (haveLogs) {
        try {
          await conn.run(logsTableSql(stagedLogs))
          logsIncluded = true
        } catch (err) {
          logger.warn('analytics', 'logs table skipped', {
            error: err
          })
          await dropLogs(conn)
        }
      }
    })
  } finally {
    // Reopen read-only on the next query; drop the staging files either way.
    closeDuckDB()
    await rm(tmp, { recursive: true, force: true })
  }

  const meta: SnapshotMeta = {
    builtAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - started),
    tables: [
      { name: 'chats', rows: staged.chats.rows.length },
      { name: 'messages', rows: staged.messages.rows.length }
    ],
    logsIncluded,
    sizeBytes: statSync(getAnalyticsDbPath()).size
  }
  await writeFile(join(dir, META_FILE), JSON.stringify(meta, null, 2), 'utf-8')
  logger.info('analytics', 'snapshot built', {
    durationMs: meta.durationMs,
    messages: staged.messages.rows.length
  })
  return meta
}

export function snapshotExists(): boolean {
  return existsSync(getAnalyticsDbPath())
}

export async function readSnapshotMeta(): Promise<SnapshotMeta | null> {
  if (!snapshotExists()) return null
  try {
    return JSON.parse(
      await readFile(join(getAnalyticsDir(), META_FILE), 'utf-8')
    ) as SnapshotMeta
  } catch {
    return null
  }
}
