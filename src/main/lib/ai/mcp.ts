import { createMCPClient } from '@ai-sdk/mcp'
import {
  Experimental_StdioMCPTransport,
  StdioConfig
} from '@ai-sdk/mcp/mcp-stdio'
import { McpTools } from '@shared/types/ai'
import { getSetting } from '../db/queries'

async function retrieveStdioMcpTools(
  { command, args }: StdioConfig,
  mcpServerName: string
) {
  const transport = new Experimental_StdioMCPTransport({
    command,
    args
  })
  const mcpClient = await createMCPClient({
    transport
  })
  console.log(`✅ The <${mcpServerName}> MCP has been registered.`)
  const tools = (await mcpClient.tools()) as McpTools['tools']
  return {
    mcpServerName,
    tools
  }
}

export async function connectMcpServers(): Promise<McpTools[]> {
  const setting = await getSetting()

  if ('mcpServers' in setting) {
    const { mcpServers } = setting
    if (mcpServers === null) return []

    try {
      const mcpServersObj: { mcpServers: { [index: string]: StdioConfig } } =
        JSON.parse(mcpServers)

      const tools = await Promise.all(
        Object.keys(mcpServersObj.mcpServers).map((mcpName) =>
          retrieveStdioMcpTools(mcpServersObj.mcpServers[mcpName], mcpName)
        )
      )

      return tools
    } catch {
      return []
    }
  } else {
    return []
  }
}
