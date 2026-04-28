import type { AgentTool } from '@mariozechner/pi-agent-core'
import type { Model } from '@mariozechner/pi-ai'
import { AdvancedTools, McpTools } from '@shared/types/ai'

import { Settings } from '../../db/schema'
import {
  createArtifact,
  deepResearch,
  editFile,
  findFiles,
  googleMapsPlaces,
  googleMapsRouting,
  grep,
  imageGeneration,
  lcmDescribe,
  lcmExpand,
  lcmGrep,
  listDirectory,
  readFile,
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
  // Optional: Agent X task execution has no owning chat, so the artifact
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
  if (enabled('googleMapsPlaces')) tools.push(googleMapsPlaces(setting))
  if (enabled('googleMapsRouting')) tools.push(googleMapsRouting(setting))
  if (enabled('imageGeneration')) tools.push(imageGeneration(setting))
  if (enabled('terminal')) tools.push(terminal)
  if (enabled('readFile')) tools.push(readFile)
  if (enabled('writeFile')) tools.push(writeFile)
  if (enabled('editFile')) tools.push(editFile)
  if (enabled('listDirectory')) tools.push(listDirectory)
  if (enabled('findFiles')) tools.push(findFiles)
  if (enabled('grep')) tools.push(grep)
  if (enabled('webFetch')) tools.push(webFetch())
  if (enabled('createArtifact') && chatId) tools.push(createArtifact(chatId))
  if (enabled('webSearch')) tools.push(webSearch(setting))

  // LCM recall tools: available when LCM is enabled
  const lcmEnabled = setting.memoryLayer?.lcmEnabled !== false
  if (lcmEnabled) {
    tools.push(lcmGrep)
    tools.push(lcmDescribe)
    if (chatModel && apiKey) {
      tools.push(lcmExpand(chatModel, apiKey))
    }
  }

  return [...mcpToolsList, ...tools]
}
