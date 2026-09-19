/**
 * Preset queries for Settings → Developer → Chat Audit. Labels are i18n keys
 * (`settings:chatAudit.presets.<id>`); the SQL is DuckDB dialect against the
 * snapshot tables `chats`, `messages`, `projects` and the `logs` view (see
 * src/main/lib/analytics/snapshot.ts for the columns). Every preset is
 * executed against a fixture snapshot in the unit tests.
 */
export interface ChatAuditPreset {
  id: string
  sql: string
}

export const CHAT_AUDIT_PRESETS: ChatAuditPreset[] = [
  {
    id: 'messagesPerDay',
    sql: `SELECT created_at::DATE AS day,
  count(*) FILTER (WHERE role = 'user') AS user_messages,
  count(*) FILTER (WHERE role = 'assistant') AS assistant_messages
FROM messages
WHERE created_at >= now() - INTERVAL 30 DAY
GROUP BY ALL
ORDER BY day`
  },
  {
    id: 'costByModel',
    sql: `SELECT provider, model, count(*) AS turns,
  sum(input_tokens) AS input_tokens,
  sum(output_tokens) AS output_tokens,
  sum(cache_read_tokens) AS cache_read_tokens,
  round(sum(cost_usd), 4) AS cost_usd
FROM messages
WHERE role = 'assistant'
GROUP BY ALL
ORDER BY cost_usd DESC NULLS LAST`
  },
  {
    id: 'toolCalls',
    sql: `SELECT tool_name, count(*) AS calls,
  count(*) FILTER (WHERE is_error) AS errors
FROM messages
WHERE role = 'toolResult'
GROUP BY ALL
ORDER BY calls DESC`
  },
  {
    id: 'longestChats',
    sql: `SELECT c.title, count(m.id) AS messages, sum(m.total_tokens) AS tokens,
  min(m.created_at) AS started, max(m.created_at) AS last_activity
FROM chats c
JOIN messages m ON m.chat_id = c.id
GROUP BY c.id, c.title
ORDER BY messages DESC
LIMIT 20`
  },
  {
    id: 'errorsByModel',
    sql: `SELECT model, count(*) AS turns,
  count(*) FILTER (WHERE error_message IS NOT NULL OR stop_reason = 'error') AS errors
FROM messages
WHERE role = 'assistant'
GROUP BY ALL
ORDER BY errors DESC, turns DESC`
  },
  {
    id: 'activityByHour',
    sql: `SELECT hour(created_at) AS hour_utc, count(*) AS messages
FROM messages
WHERE role = 'user'
GROUP BY ALL
ORDER BY hour_utc`
  },
  {
    id: 'searchText',
    sql: `SELECT c.title, m.role, m.created_at, left(m.text, 120) AS excerpt
FROM messages m
JOIN chats c ON c.id = m.chat_id
WHERE m.text ILIKE '%keyword%'
ORDER BY m.created_at DESC
LIMIT 50`
  },
  {
    id: 'logsBySeverity',
    sql: `SELECT scope.name AS scope, severityText AS severity, count(*) AS entries
FROM logs
GROUP BY ALL
ORDER BY entries DESC`
  }
]
