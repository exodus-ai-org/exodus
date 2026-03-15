import type { AgentTool, AgentToolResult } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { McpTools } from '@shared/types/ai'
import { getSetting } from '../db/queries'

interface StdioConfig {
  command: string
  args?: string[]
}

// Lazy cache: MCP servers are connected on first use, not at startup.
// Cache is invalidated automatically when mcpServers config changes.
let mcpToolsCache: McpTools[] | null = null
let cachedMcpServersJson: string | null = null

async function retrieveStdioMcpTools(
  { command, args }: StdioConfig,
  mcpServerName: string
): Promise<McpTools> {
  const transport = new StdioClientTransport({
    command,
    args: args ?? []
  })
  const client = new Client({ name: 'exodus', version: '1.0.0' })
  await client.connect(transport)
  console.log(`✅ The <${mcpServerName}> MCP has been registered.`)

  const toolsResult = await client.listTools()

  const agentTools: AgentTool[] = toolsResult.tools.map((mcpTool) => {
    // Convert JSON Schema to TypeBox using Type.Unsafe
    const schema = Type.Unsafe<Record<string, unknown>>(
      (mcpTool.inputSchema as Record<string, unknown>) ?? Type.Object({})
    )

    const agentTool: AgentTool = {
      name: mcpTool.name,
      label: mcpTool.name,
      description: mcpTool.description ?? '',
      parameters: schema,
      execute: async (
        _toolCallId: string,
        params: Record<string, unknown>
      ): Promise<AgentToolResult<unknown>> => {
        const result = await client.callTool({
          name: mcpTool.name,
          arguments: params
        })

        const content = result.content as Array<{
          type: string
          text?: string
          data?: string
          mimeType?: string
        }>
        const piContent = content.map((c) => {
          if (c.type === 'image' && c.data) {
            return {
              type: 'image' as const,
              data: c.data,
              mimeType: c.mimeType ?? 'image/png'
            }
          }
          return {
            type: 'text' as const,
            text: c.text ?? JSON.stringify(c)
          }
        })

        return {
          content:
            piContent.length > 0
              ? piContent
              : [{ type: 'text' as const, text: JSON.stringify(result) }],
          details: result
        }
      }
    }

    return agentTool
  })

  return { mcpServerName, tools: agentTools }
}

export async function getMcpTools(): Promise<McpTools[]> {
  const setting = await getSetting()
  const mcpServersJson = setting.mcpServers ?? null

  if (!mcpServersJson) return []

  // Return cached tools if MCP config hasn't changed
  if (mcpToolsCache !== null && cachedMcpServersJson === mcpServersJson) {
    return mcpToolsCache
  }

  try {
    const mcpServersObj: { mcpServers: { [index: string]: StdioConfig } } =
      JSON.parse(mcpServersJson)
    const tools = await Promise.all(
      Object.keys(mcpServersObj.mcpServers).map((mcpName) =>
        retrieveStdioMcpTools(mcpServersObj.mcpServers[mcpName], mcpName)
      )
    )
    mcpToolsCache = tools
    cachedMcpServersJson = mcpServersJson
    return tools
  } catch {
    return []
  }
}
