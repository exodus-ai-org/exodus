import type { AgentTool } from '@mariozechner/pi-agent-core'
import type { Model } from '@mariozechner/pi-ai'
import { AdvancedTools, McpTools } from '@shared/types/ai'
import type { WebSearchResult } from '@shared/types/web-search'

import { Settings } from '../../db/schema'
import { resolveKnowledgeBase } from '../../knowledge-base/resolve-knowledge-base'
import { logger } from '../../logger'
import {
  computerUse,
  createArtifact,
  deepResearch,
  editFile,
  findFiles,
  grep,
  imageGeneration,
  lcmDescribe,
  lcmExpand,
  lcmGrep,
  listDirectory,
  mapItinerary,
  readFile,
  searchKnowledgeBase,
  terminal,
  weather,
  webFetch,
  webSearch,
  writeFile
} from '../calling-tools'

/**
 * Type-erased AgentTool for heterogeneous collections.
 * AgentTool<T> is contravariant on T, so typed tools can't go into AgentTool[].
 * This mirrors pi-agent-core's own default: AgentTool<TSchema, any>.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ErasedTool = AgentTool<any>

// OpenAI's Chat Completions API hard-rejects a `tools` array over 128 entries
// (400 "array too long") — the whole request fails, not just the overflow
// tools. Built-ins stay comfortably under this on their own; MCP servers are
// what push the total over (a single server can expose 100+ tools), so they
// get truncated to whatever budget built-ins leave. Applied for every
// provider, not just OpenAI: no other provider here documents a higher
// tolerance, and 128+ tool schemas bloat the request regardless.
const MAX_TOOLS = 128

export function bindCallingTools({
  advancedTools,
  setting,
  chatModel,
  apiKey,
  mcpTools = [],
  chatId
}: {
  advancedTools: AdvancedTools[]
  setting: Settings
  chatModel?: Model<string>
  apiKey?: string
  mcpTools?: McpTools[]
  // Optional: Philharmonic task execution has no owning chat, so the artifact
  // tool is skipped there (artifacts are a chat-UI affordance).
  chatId?: string
}): ErasedTool[] {
  if (advancedTools.includes(AdvancedTools.DeepResearch)) {
    return [deepResearch]
  }

  const mcpToolsList: ErasedTool[] = mcpTools.flatMap((t) => t.tools)

  const disabledTools = new Set(setting.tools?.disabledTools ?? [])
  const enabled = (key: string) => !disabledTools.has(key)

  const tools: ErasedTool[] = []

  if (enabled('weather')) tools.push(weather)
  if (enabled('mapItinerary')) tools.push(mapItinerary(setting))
  if (enabled('imageGeneration')) tools.push(imageGeneration(setting))
  if (enabled('terminal')) tools.push(terminal)
  if (enabled('readFile')) tools.push(readFile)
  if (enabled('writeFile')) tools.push(writeFile)
  if (enabled('editFile')) tools.push(editFile)
  if (enabled('listDirectory')) tools.push(listDirectory)
  if (enabled('findFiles')) tools.push(findFiles)
  if (enabled('grep')) tools.push(grep)
  // webSearch + webFetch share one rank registry so 【N-source】 citations
  // resolve regardless of which tool produced source N.
  const webSources = new Map<string, WebSearchResult>()
  if (enabled('webFetch')) tools.push(webFetch(webSources))
  if (enabled('createArtifact') && chatId) tools.push(createArtifact(chatId))
  if (enabled('webSearch')) tools.push(webSearch(setting, webSources))
  if (setting.computerUse?.enabled && enabled('computerUse'))
    tools.push(computerUse)

  const kb = resolveKnowledgeBase(setting)
  if (kb && enabled('searchKnowledgeBase')) {
    tools.push(searchKnowledgeBase(kb, setting.knowledgeBase))
  }

  // LCM recall tools: available when LCM is enabled
  const lcmEnabled = setting.memory?.lcmEnabled !== false
  if (lcmEnabled) {
    tools.push(lcmGrep)
    tools.push(lcmDescribe)
    if (chatModel && apiKey) {
      tools.push(lcmExpand(chatModel, apiKey))
    }
  }

  const combined = [...tools, ...mcpToolsList]
  if (combined.length <= MAX_TOOLS) return combined

  const kept = combined.slice(0, MAX_TOOLS)
  logger.warn('chat', 'Too many tools bound; truncating to provider limit', {
    total: combined.length,
    kept: kept.length,
    dropped: combined.length - kept.length
  })
  return kept
}
