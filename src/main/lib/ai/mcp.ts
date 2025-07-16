import { McpTools } from '@shared/types/ai'
import { experimental_createMCPClient } from 'ai'
import { Experimental_StdioMCPTransport, StdioConfig } from 'ai/mcp-stdio'
import { getSettings } from '../db/queries'

async function retrieveStdioMcpTools(
  { command, args }: StdioConfig,
  mcpServerName: string
) {
  const transport = new Experimental_StdioMCPTransport({
    command,
    args
  })
  const mcpClient = await experimental_createMCPClient({
    transport
  })
  console.log(`✅ The <${mcpServerName}> MCP has been registered.`)
  const tools = await mcpClient.tools()
  return {
    mcpServerName,
    tools
  }
}

export async function connectMcpServers(): Promise<McpTools[]> {
  const settings = await getSettings()

  if ('mcpServers' in settings) {
    const { mcpServers } = settings
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
