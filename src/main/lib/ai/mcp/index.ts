import { experimental_createMCPClient, Tool } from 'ai'
import { Experimental_StdioMCPTransport, StdioConfig } from 'ai/mcp-stdio'
import { getSetting } from '../../db/queries'

async function retrieveMcpTools({ command, args }: StdioConfig) {
  const transport = new Experimental_StdioMCPTransport({
    command,
    args
  })
  const mcpClient = await experimental_createMCPClient({
    transport
  })
  const tools = await mcpClient.tools()
  return tools
}

export async function connectMcpServers(): Promise<Record<
  string,
  Tool
> | null> {
  const setting = await getSetting()

  if ('mcpServers' in setting) {
    const { mcpServers } = setting
    if (mcpServers === null) return null

    try {
      const mcpServersObj: { mcpServers: { [index: string]: StdioConfig } } =
        JSON.parse(mcpServers)

      const toolsArr = await Promise.all(
        Object.values(mcpServersObj.mcpServers).map((stdioConfig) =>
          retrieveMcpTools(stdioConfig)
        )
      )

      const tools = toolsArr.reduce((acc, obj) => {
        if (typeof obj === 'object' && obj !== null) {
          return { ...acc, ...obj }
        }
        return acc
      }, {})

      return tools
    } catch {
      return null
    }
  } else {
    return null
  }
}
