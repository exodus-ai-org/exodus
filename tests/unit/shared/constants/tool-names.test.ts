import {
  LEGACY_TOOL_NAMES,
  TOOL_NAMES,
  toToolName
} from '@exodus/shared/constants/tool-names'
import { describe, expect, it } from 'vitest'

describe('tool names', () => {
  it('are snake_case and unique', () => {
    const values = Object.values(TOOL_NAMES)
    expect(values).toHaveLength(19)
    expect(new Set(values).size).toBe(19)
    for (const v of values) expect(v).toMatch(/^[a-z]+(_[a-z]+)*$/u)
  })

  it('maps every legacy camelCase name to its snake_case name', () => {
    expect(toToolName('webSearch')).toBe('web_search')
    expect(toToolName('searchKnowledgeBase')).toBe('search_knowledge_base')
    expect(toToolName('grep')).toBe('grep')
    expect(Object.keys(LEGACY_TOOL_NAMES)).toHaveLength(19)
  })

  it('passes unknown names through (MCP tools are not renamed)', () => {
    expect(toToolName('github_create_issue')).toBe('github_create_issue')
  })
})
