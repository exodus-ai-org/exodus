/**
 * Columns of the Chat Audit snapshot (`~/.exodus/analytics/exodus.duckdb`),
 * as DuckDB types. One definition serves both sides: the main process builds
 * the tables from it (`src/main/lib/analytics/snapshot.ts`) and the SQL
 * editor's autocomplete offers exactly these names.
 */
export const CHAT_AUDIT_SCHEMA = {
  chats: {
    id: 'VARCHAR',
    title: 'VARCHAR',
    favorite: 'BOOLEAN',
    project_id: 'VARCHAR',
    project_name: 'VARCHAR',
    created_at: 'TIMESTAMP'
  },
  messages: {
    id: 'VARCHAR',
    chat_id: 'VARCHAR',
    role: 'VARCHAR',
    provider: 'VARCHAR',
    model: 'VARCHAR',
    api: 'VARCHAR',
    stop_reason: 'VARCHAR',
    error_message: 'VARCHAR',
    tool_name: 'VARCHAR',
    tool_call_id: 'VARCHAR',
    is_error: 'BOOLEAN',
    text: 'VARCHAR',
    input_tokens: 'BIGINT',
    output_tokens: 'BIGINT',
    cache_read_tokens: 'BIGINT',
    cache_write_tokens: 'BIGINT',
    total_tokens: 'BIGINT',
    cost_usd: 'DOUBLE',
    duration_ms: 'BIGINT',
    created_at: 'TIMESTAMP',
    content: 'JSON'
  },
  projects: {
    id: 'VARCHAR',
    name: 'VARCHAR',
    description: 'VARCHAR',
    created_at: 'TIMESTAMP',
    updated_at: 'TIMESTAMP'
  },
  /** A view over ~/.exodus/logs/*.jsonl; typed so ragged `attributes` never break inference. */
  logs: {
    timestamp: 'TIMESTAMP',
    severityNumber: 'INTEGER',
    severityText: 'VARCHAR',
    body: 'VARCHAR',
    scope: 'STRUCT(name VARCHAR)',
    attributes: 'JSON',
    resource: 'JSON',
    traceId: 'VARCHAR',
    originTraceId: 'VARCHAR'
  }
} as const

export type ChatAuditTable = keyof typeof CHAT_AUDIT_SCHEMA
