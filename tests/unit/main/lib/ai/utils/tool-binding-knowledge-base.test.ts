import { beforeEach, describe, expect, it, vi } from 'vitest'

// Every tool factory is stubbed so bindCallingTools can be exercised without
// pulling in pi-ai's Type builder or the real tool implementations.
const stub = (name: string) => ({ name })
vi.mock('@main/lib/ai/calling-tools', () => ({
  createArtifact: () => stub('createArtifact'),
  deepResearch: stub('deepResearch'),
  editFile: stub('editFile'),
  findFiles: stub('findFiles'),
  grep: stub('grep'),
  imageGeneration: () => stub('imageGeneration'),
  lcmDescribe: stub('lcmDescribe'),
  lcmExpand: () => stub('lcmExpand'),
  lcmGrep: stub('lcmGrep'),
  listDirectory: stub('listDirectory'),
  mapItinerary: () => stub('mapItinerary'),
  readFile: stub('readFile'),
  searchKnowledgeBase: (_client: unknown, _cfg: unknown) =>
    stub('searchKnowledgeBase'),
  terminal: stub('terminal'),
  weather: stub('weather'),
  webFetch: () => stub('webFetch'),
  webSearch: () => stub('webSearch'),
  writeFile: stub('writeFile')
}))

const mockResolveKnowledgeBase = vi.fn()
vi.mock('@main/lib/knowledge-base/resolve-knowledge-base', () => ({
  resolveKnowledgeBase: mockResolveKnowledgeBase
}))

const mockLoggerWarn = vi.fn()
vi.mock('@main/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: mockLoggerWarn,
    error: vi.fn(),
    debug: vi.fn()
  }
}))

const { bindCallingTools } =
  await import('@main/lib/ai/utils/tool-binding-util')

const names = (tools: unknown[]) =>
  tools.map((t) => (t as { name: string }).name)

describe('bindCallingTools — knowledge base', () => {
  beforeEach(() => mockResolveKnowledgeBase.mockReset())

  it('binds searchKnowledgeBase when a knowledge base resolves', () => {
    mockResolveKnowledgeBase.mockReturnValue({ retrieve: vi.fn() })
    const tools = bindCallingTools({
      advancedTools: [],
      setting: { id: 'global', knowledgeBase: { url: 'http://h:9621' } },
      mcpTools: []
    } as never)
    expect(names(tools)).toContain('searchKnowledgeBase')
  })

  it('does not bind it when the knowledge base is unconfigured', () => {
    mockResolveKnowledgeBase.mockReturnValue(null)
    const tools = bindCallingTools({
      advancedTools: [],
      setting: { id: 'global' },
      mcpTools: []
    } as never)
    expect(names(tools)).not.toContain('searchKnowledgeBase')
  })

  it('does not bind it when the tool is disabled in settings', () => {
    mockResolveKnowledgeBase.mockReturnValue({ retrieve: vi.fn() })
    const tools = bindCallingTools({
      advancedTools: [],
      setting: {
        id: 'global',
        knowledgeBase: { url: 'http://h:9621' },
        tools: { disabledTools: ['searchKnowledgeBase'] }
      },
      mcpTools: []
    } as never)
    expect(names(tools)).not.toContain('searchKnowledgeBase')
  })
})

describe('bindCallingTools — provider tool-count cap', () => {
  beforeEach(() => {
    mockResolveKnowledgeBase.mockReset().mockReturnValue(null)
    mockLoggerWarn.mockReset()
  })

  it('truncates a combined tool count over 128 (OpenAI rejects the request otherwise)', () => {
    // A single MCP server can expose far more tools than any built-in set —
    // this is the exact shape that produced "array too long ... length 152".
    const mcpTools = [
      {
        mcpServerName: 'alphavantage',
        tools: Array.from({ length: 140 }, (_, i) => stub(`mcp-${i}`))
      }
    ]
    const tools = bindCallingTools({
      advancedTools: [],
      setting: { id: 'global' },
      mcpTools
    } as never)
    expect(tools.length).toBe(128)
    expect(mockLoggerWarn).toHaveBeenCalled()
  })

  it('keeps every built-in tool before filling the remaining budget with MCP tools', () => {
    const mcpTools = [
      {
        mcpServerName: 'alphavantage',
        tools: Array.from({ length: 140 }, (_, i) => stub(`mcp-${i}`))
      }
    ]
    const tools = bindCallingTools({
      advancedTools: [],
      setting: { id: 'global' },
      mcpTools
    } as never)
    expect(names(tools)).toContain('weather')
    expect(names(tools)).toContain('terminal')
  })

  it('does not truncate or warn when under the limit', () => {
    const tools = bindCallingTools({
      advancedTools: [],
      setting: { id: 'global' },
      mcpTools: [{ mcpServerName: 'small', tools: [stub('mcp-1')] }]
    } as never)
    expect(tools.length).toBeLessThan(128)
    expect(mockLoggerWarn).not.toHaveBeenCalled()
  })
})
