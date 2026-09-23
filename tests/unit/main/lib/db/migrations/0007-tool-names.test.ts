import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  createMigratedPglite,
  migrationFile,
  migrationSql
} from '../../../../helpers/migrated-pglite'

let pglite: PGlite

const CHAT = '11111111-1111-4111-8111-111111111111'

beforeAll(async () => {
  pglite = await createMigratedPglite('0006')
  await pglite.exec(`INSERT INTO "chat" ("id","title") VALUES ('${CHAT}','t')`)
  await pglite.exec(`
    INSERT INTO "message" ("id","chatId","role","content","toolCallId","toolName","isError")
    VALUES
    ('22222222-2222-4222-8222-222222222222','${CHAT}','assistant',
     '[{"type":"text","text":"looking"},{"type":"toolCall","id":"c1","name":"webSearch","arguments":{}},{"type":"toolCall","id":"c2","name":"github_issue","arguments":{}}]',
     NULL, NULL, NULL),
    ('33333333-3333-4333-8333-333333333333','${CHAT}','toolResult','[]','c1','webSearch',false),
    ('44444444-4444-4444-8444-444444444444','${CHAT}','toolResult','[]','c2','github_issue',false),
    ('55555555-5555-4555-8555-555555555555','${CHAT}','toolResult','[]','c3','searchKnowledgeBase',false)
  `)
  await pglite.exec(`
    INSERT INTO "settings" ("id","tools") VALUES
    ('global', '{"disabledTools":["webSearch","grep","some_mcp_tool"]}')
  `)
  await pglite.exec(migrationSql(migrationFile('0007')))
}, 60_000)

afterAll(async () => {
  await pglite.close()
})

describe('migration 0007: snake_case tool names', () => {
  it('rewrites the toolName column on toolResult rows', async () => {
    const { rows } = await pglite.query<{ toolName: string }>(
      `SELECT "toolName" FROM "message" WHERE "role" = 'toolResult' ORDER BY "toolName"`
    )
    expect(rows.map((r) => r.toolName)).toEqual([
      'github_issue',
      'search_knowledge_base',
      'web_search'
    ])
  })

  it('rewrites toolCall block names inside assistant content, leaving text blocks and MCP names alone', async () => {
    const { rows } = await pglite.query<{
      content: Array<{ type: string; name?: string; text?: string }>
    }>(`SELECT "content" FROM "message" WHERE "role" = 'assistant'`)
    expect(rows[0].content).toEqual([
      { type: 'text', text: 'looking' },
      { type: 'toolCall', id: 'c1', name: 'web_search', arguments: {} },
      { type: 'toolCall', id: 'c2', name: 'github_issue', arguments: {} }
    ])
  })

  it('rewrites the disabled-tool keys in settings', async () => {
    const { rows } = await pglite.query<{
      tools: { disabledTools: string[] }
    }>(`SELECT "tools" FROM "settings"`)
    expect(rows[0].tools.disabledTools).toEqual([
      'web_search',
      'grep',
      'some_mcp_tool'
    ])
  })
})
