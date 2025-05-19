import { experimental_createMCPClient, Tool } from 'ai'
import { Experimental_StdioMCPTransport, StdioConfig } from 'ai/mcp-stdio'
import { getSettings } from '../db/queries'

// async function retrieveDeepResearchMcp() {
//   try {
//     const sseClient = await experimental_createMCPClient({
//       transport: new StreamableHTTPClientTransport(
//         new URL('http://localhost:63129/mcp')
//       )
//     })
//     console.log(
//       '✅ Deep Research Streamable HTTP server MCP has been registered.'
//     )

//     const tool = await sseClient.tools()
//     return tool
//   } catch {
//     return null
//   }
// }

async function retrieveStdioMcpTools({ command, args }: StdioConfig) {
  const transport = new Experimental_StdioMCPTransport({
    command,
    args
  })
  const mcpClient = await experimental_createMCPClient({
    transport
  })
  console.log('✅ Stdio server MCPs have been registered.')
  const tools = await mcpClient.tools()
  return tools
}

export async function connectMcpServers(): Promise<Record<
  string,
  Tool
> | null> {
  const settings = await getSettings()

  if ('mcpServers' in settings) {
    const { mcpServers } = settings
    if (mcpServers === null) return null

    try {
      const mcpServersObj: { mcpServers: { [index: string]: StdioConfig } } =
        JSON.parse(mcpServers)

      const toolsArr = await Promise.all(
        Object.values(mcpServersObj.mcpServers).map((stdioConfig) =>
          retrieveStdioMcpTools(stdioConfig)
        )
      )
      // const deepResearch = await retrieveDeepResearchMcp()
      // if (deepResearch) {
      //   toolsArr.push(deepResearch)
      // }

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
