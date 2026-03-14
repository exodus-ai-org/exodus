import { createMCPClient } from '@ai-sdk/mcp'
import {
  Experimental_StdioMCPTransport,
  StdioConfig
} from '@ai-sdk/mcp/mcp-stdio'
import { McpTools } from '@shared/types/ai'
import { getSetting } from '../db/queries'

// Lazy cache: MCP servers are connected on first use, not at startup.
// Cache is invalidated automatically when mcpServers config changes.
let mcpToolsCache: McpTools[] | null = null
let cachedMcpServersJson: string | null = null

async function retrieveStdioMcpTools(
  { command, args }: StdioConfig,
  mcpServerName: string
) {
  const transport = new Experimental_StdioMCPTransport({ command, args })
  const mcpClient = await createMCPClient({ transport })
  console.log(`✅ The <${mcpServerName}> MCP has been registered.`)
  const tools = (await mcpClient.tools()) as McpTools['tools']
  return { mcpServerName, tools }
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
