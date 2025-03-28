import { ListToolsResultSchema } from '@modelcontextprotocol/sdk/types'
import { z } from 'zod'

export interface McpServerParams {
  command: string
  args: string[]
  env?: Record<string, string>
}

export interface McpServerKV {
  [id: string]: McpServerParams
}

export interface McpServerConfig {
  mcpServers: McpServerKV
}

export type ToolMap = {
  [index: string]: z.infer<typeof ListToolsResultSchema>['tools']
}
