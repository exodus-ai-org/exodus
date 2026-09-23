import { TOOL_NAMES } from '@exodus/shared/constants/tool-names'
import { getSystemPrompt } from '@main/lib/ai/prompts'
import { describe, expect, it } from 'vitest'

const MCP_TOOLS = new Set<string>([
  TOOL_NAMES.listMcpTools,
  TOOL_NAMES.callMcpTool
])

describe('getSystemPrompt', () => {
  it('explains every built-in tool by its wire name, so a new tool cannot go unmentioned', () => {
    const prompt = getSystemPrompt({})
    for (const name of Object.values(TOOL_NAMES)) {
      if (MCP_TOOLS.has(name)) continue
      expect(prompt, name).toContain(`\`${name}\``)
    }
  })

  it('names the MCP toolbox only when a server is connected', () => {
    expect(getSystemPrompt({})).not.toContain('<mcp_servers>')
    const withMcp = getSystemPrompt({ mcpDirectory: '- github (2 tools)' })
    expect(withMcp).toContain('<mcp_servers>')
    expect(withMcp).toContain('- github (2 tools)')
    expect(withMcp).toContain(TOOL_NAMES.listMcpTools)
    expect(withMcp).toContain(TOOL_NAMES.callMcpTool)
  })

  it('carries the workspace path and the skills index only when given', () => {
    const bare = getSystemPrompt({})
    expect(bare).not.toContain('<workspace>')
    expect(bare).not.toContain('<skills>')

    const full = getSystemPrompt({
      workspaceDir: '/home/u/.exodus/workspace/abc',
      skillsIndex:
        '- alpha: Draw charts — /home/u/.exodus/skills/alpha/SKILL.md'
    })
    expect(full).toContain('<workspace>')
    expect(full).toContain('/home/u/.exodus/workspace/abc')
    expect(full).toContain('<skills>')
    expect(full).toContain('- alpha: Draw charts')
    // The rule that makes the index work: read, then follow, without asking.
    expect(full).toMatch(/read .*SKILL\.md/u)
  })

  it('states the autonomy policy and the hard stops', () => {
    const prompt = getSystemPrompt({})
    expect(prompt).toContain('<tool_use_rules>')
    expect(prompt).toContain('<hard_stops>')
    expect(prompt).toMatch(/without asking/iu)
  })

  it('keeps the citation rules under a tag the prose can point at', () => {
    const prompt = getSystemPrompt({})
    expect(prompt).toContain('<citation_rules>')
    expect(prompt).toContain('【N-source】')
  })

  it('stays within budget', () => {
    // Roughly 3.5 chars a token: keep the fixed part under ~2.5k tokens.
    expect(getSystemPrompt({}).length).toBeLessThan(9_000)
  })
})
