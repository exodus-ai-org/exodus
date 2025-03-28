import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { mcpServerConfigs } from './mcp-server'
import { McpServerParams } from './types'

export async function initClient() {
  try {
    const clients = await Promise.all(
      Object.entries(mcpServerConfigs.mcpServers).map(async ([name, serverConfig]) => {
        const client = await connectToServer(name, serverConfig)
        const { tools } = await client.listTools()
        return { name, client, tools }
      })
    )
    return clients
  } catch (error) {
    console.error('Error during client initialization:', error?.message)
  }
}

export async function connectToServer(
  name: string,
  serverConfig: McpServerParams
) {
  const client = new Client(
    { name: `${name}-client`, version: '1.0.0' },
    { capabilities: { tools: {}, resources: {}, prompts: {} } }
  )
  try {
    const transport = new StdioClientTransport(serverConfig)
    client.connect(transport)
    return client
  } catch (error) {
    console.error('Failed to connect to MCP server: ', error)
  }
}
