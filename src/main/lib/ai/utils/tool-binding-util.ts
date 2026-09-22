import type { AgentTool } from '@earendil-works/pi-agent-core'
import type { Model } from '@earendil-works/pi-ai'
import { TOOL_NAMES, toToolName } from '@exodus/shared/constants/tool-names'
import { AdvancedTools, McpTools } from '@exodus/shared/types/ai'
import type { WebSearchResult } from '@exodus/shared/types/web-search'

import { Settings } from '../../db/schema'
import { resolveKnowledgeBase } from '../../knowledge-base/resolve-knowledge-base'
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
import { mcpToolbox } from '../calling-tools/mcp-toolbox'

/**
 * Type-erased AgentTool for heterogeneous collections.
 * AgentTool<T> is contravariant on T, so typed tools can't go into AgentTool[].
 * This mirrors pi-agent-core's own default: AgentTool<TSchema, any>.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ErasedTool = AgentTool<any>

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

  // Keys saved before the snake_case rename still disable the same tool.
  const disabledTools = new Set(
    (setting.tools?.disabledTools ?? []).map(toToolName)
  )
  const enabled = (key: string) => !disabledTools.has(key)

  const tools: ErasedTool[] = []

  if (enabled(TOOL_NAMES.weather)) tools.push(weather)
  if (enabled(TOOL_NAMES.mapItinerary)) tools.push(mapItinerary(setting))
  if (enabled(TOOL_NAMES.imageGeneration)) tools.push(imageGeneration(setting))
  if (enabled(TOOL_NAMES.terminal)) tools.push(terminal)
  if (enabled(TOOL_NAMES.readFile)) tools.push(readFile)
  if (enabled(TOOL_NAMES.writeFile)) tools.push(writeFile)
  if (enabled(TOOL_NAMES.editFile)) tools.push(editFile)
  if (enabled(TOOL_NAMES.listDirectory)) tools.push(listDirectory)
  if (enabled(TOOL_NAMES.findFiles)) tools.push(findFiles)
  if (enabled(TOOL_NAMES.grep)) tools.push(grep)
  // webSearch + webFetch share one rank registry so 【N-source】 citations
  // resolve regardless of which tool produced source N.
  const webSources = new Map<string, WebSearchResult>()
  if (enabled(TOOL_NAMES.webFetch)) tools.push(webFetch(webSources))
  if (enabled(TOOL_NAMES.createArtifact) && chatId)
    tools.push(createArtifact(chatId))
  if (enabled(TOOL_NAMES.webSearch)) tools.push(webSearch(setting, webSources))
  if (setting.computerUse?.enabled && enabled(TOOL_NAMES.computerUse))
    tools.push(computerUse)

  const kb = resolveKnowledgeBase(setting)
  if (kb && enabled(TOOL_NAMES.searchKnowledgeBase)) {
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

  // MCP servers are reached through the two-tool toolbox, never bound one
  // by one: providers cap the tools array (OpenAI: 128) and a single server
  // can exceed that alone. 19 built-ins plus two sit far below every limit.
  if (mcpTools.length > 0) tools.push(...mcpToolbox(mcpTools))

  return tools
}
