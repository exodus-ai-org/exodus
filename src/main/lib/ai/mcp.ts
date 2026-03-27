import type { AgentTool, AgentToolResult } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { McpTools } from '@shared/types/ai'

import { getAllMcpServers, getMcpServersByNames } from '../db/agent-x-queries'
import type { McpServer } from '../db/schema'
import { logger } from '../logger'

// Cache stores both tools and the client so we can close connections on invalidation.
interface CachedMcp {
  tools: McpTools
  client: Client
}
const mcpCache = new Map<string, CachedMcp>()

/** Close and remove a single server from cache. */
export async function invalidateMcpCache(serverName: string) {
  const cached = mcpCache.get(serverName)
  if (cached) {
    cached.client.close().catch(() => {})
    mcpCache.delete(serverName)
  }
}

/** Close all connections and clear the entire cache. */
export async function invalidateAllMcpCache() {
  for (const [, cached] of mcpCache) {
    cached.client.close().catch(() => {})
  }
  mcpCache.clear()
}

function createTransport(server: McpServer) {
  const type = server.transportType ?? 'stdio'

  if (type === 'streamable-http' && server.url) {
    return new StreamableHTTPClientTransport(new URL(server.url), {
      requestInit: server.headers
        ? { headers: server.headers as Record<string, string> }
        : undefined
    })
  }

  if (type === 'sse' && server.url) {
    return new SSEClientTransport(new URL(server.url), {
      requestInit: server.headers
        ? { headers: server.headers as Record<string, string> }
        : undefined
    })
  }

  // Default: stdio
  return new StdioClientTransport({
    command: server.command ?? '',
    args: (server.args as string[]) ?? [],
    env: (server.env as Record<string, string>) ?? undefined
  })
}

async function connectMcpServer(server: McpServer): Promise<McpTools> {
  const cached = mcpCache.get(server.name)
  if (cached) return cached.tools

  const transport = createTransport(server)
  const client = new Client({ name: 'exodus', version: '1.0.0' })
  await client.connect(transport)
  logger.info('mcp', 'MCP server registered', {
    name: server.name,
    transport: server.transportType ?? 'stdio'
  })

  const toolsResult = await client.listTools()

  const agentTools: AgentTool[] = toolsResult.tools.map((mcpTool) => {
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
        params: unknown
      ): Promise<AgentToolResult<unknown>> => {
        const result = await client.callTool({
          name: mcpTool.name,
          arguments: params as Record<string, unknown>
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

  const tools: McpTools = { mcpServerName: server.name, tools: agentTools }
  mcpCache.set(server.name, { tools, client })
  return tools
}

/**
 * Get MCP tools for all active servers from the registry.
 */
export async function getMcpTools(): Promise<McpTools[]> {
  const servers = await getAllMcpServers()
  const active = servers.filter((s) => s.isActive)
  if (active.length === 0) return []

  const results = await Promise.allSettled(
    active.map((s) => connectMcpServer(s))
  )
  return results
    .filter(
      (r): r is PromiseFulfilledResult<McpTools> => r.status === 'fulfilled'
    )
    .map((r) => r.value)
}

/**
 * Get MCP tools filtered by server names (for department-scoped execution).
 */
export async function getMcpToolsByNames(names: string[]): Promise<McpTools[]> {
  if (names.length === 0) return []
  const servers = await getMcpServersByNames(names)
  const active = servers.filter((s) => s.isActive)
  if (active.length === 0) return []

  const results = await Promise.allSettled(
    active.map((s) => connectMcpServer(s))
  )
  return results
    .filter(
      (r): r is PromiseFulfilledResult<McpTools> => r.status === 'fulfilled'
    )
    .map((r) => r.value)
}
