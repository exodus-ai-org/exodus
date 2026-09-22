import { existsSync, readdirSync, statSync } from 'fs'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'

import type { Usage } from '@earendil-works/pi-ai'
import { CHAT_AUDIT_SCHEMA } from '@exodus/shared/constants/chat-audit-schema'
import type { SnapshotMeta } from '@exodus/shared/types/analytics'
import { eq } from 'drizzle-orm'

import { db } from '../db/db'
import { chat, message, project } from '../db/schema'
import { logger } from '../logger'
import { getAnalyticsDbPath, getAnalyticsDir, getLogsDir } from '../paths'
import { closeDuckDB, withReadWrite } from './duckdb'

/**
 * Copies chats / messages / projects out of PGlite into the DuckDB file the
 * Chat Audit console queries, plus a `logs` view straight over the JSONL log
 * files. Rows are staged as NDJSON and loaded with `read_json(..., columns)`
 * so every column has an explicit type (no inference surprises on an empty
 * or all-null column), then the staging files are deleted.
 */

const META_FILE = 'snapshot.json'

export interface ChatSource {
  id: string
  title: string
  favorite: boolean | null
  projectId: string | null
  projectName: string | null
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

export interface ProjectSource {
  id: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}

export interface SourceRows {
  chats: ChatSource[]
  messages: MessageSource[]
  projects: ProjectSource[]
}

// ─── Row mappers (pure, unit-tested) ─────────────────────────────────────────

// The column definitions live in the shared package so the renderer's SQL
// autocomplete and this loader can never disagree.
export const CHAT_COLUMNS = CHAT_AUDIT_SCHEMA.chats
export const MESSAGE_COLUMNS = CHAT_AUDIT_SCHEMA.messages
export const PROJECT_COLUMNS = CHAT_AUDIT_SCHEMA.projects
export const LOG_COLUMNS = CHAT_AUDIT_SCHEMA.logs

export function toChatRow(c: ChatSource) {
  return {
    id: c.id,
    title: c.title,
    favorite: c.favorite ?? false,
    project_id: c.projectId,
    project_name: c.projectName,
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

export function toProjectRow(p: ProjectSource) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString()
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

export function logsViewSql(logsDir: string): string {
  return `CREATE OR REPLACE VIEW logs AS SELECT * FROM read_json(${sqlString(join(logsDir, '*.jsonl'))}, format = 'newline_delimited', union_by_name = true, ignore_errors = true, columns = ${columnsClause(LOG_COLUMNS)})`
}

// ─── Source ──────────────────────────────────────────────────────────────────

async function readSource(): Promise<SourceRows> {
  const [chats, messages, projects] = await Promise.all([
    db
      .select({
        id: chat.id,
        title: chat.title,
        favorite: chat.favorite,
        projectId: chat.projectId,
        projectName: project.name,
        createdAt: chat.createdAt
      })
      .from(chat)
      .leftJoin(project, eq(chat.projectId, project.id)),
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
      .from(message),
    db
      .select({
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      })
      .from(project)
  ])
  return { chats, messages, projects }
}

// ─── Build / status ──────────────────────────────────────────────────────────

function ndjson(rows: unknown[]): string {
  return (
    rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : '')
  )
}

function hasLogFiles(dir: string): boolean {
  try {
    return readdirSync(dir).some((f) => f.endsWith('.jsonl'))
  } catch {
    return false
  }
}

export async function buildSnapshot(
  opts: { source?: () => Promise<SourceRows> } = {}
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
    },
    projects: {
      file: join(tmp, 'projects.ndjson'),
      rows: rows.projects.map(toProjectRow)
    }
  }
  await Promise.all(
    Object.values(staged).map((s) => writeFile(s.file, ndjson(s.rows), 'utf-8'))
  )

  const logsDir = getLogsDir()
  let logsIncluded = false
  try {
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
      await conn.run(
        loadTableSql(
          'projects',
          staged.projects.file,
          PROJECT_COLUMNS,
          staged.projects.rows.length
        )
      )
      if (hasLogFiles(logsDir)) {
        try {
          await conn.run(logsViewSql(logsDir))
          logsIncluded = true
        } catch (err) {
          logger.warn('analytics', 'logs view skipped', { error: String(err) })
          await conn.run('DROP VIEW IF EXISTS logs')
        }
      } else {
        await conn.run('DROP VIEW IF EXISTS logs')
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
      { name: 'messages', rows: staged.messages.rows.length },
      { name: 'projects', rows: staged.projects.rows.length }
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
