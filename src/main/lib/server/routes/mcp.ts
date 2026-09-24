import { Hono } from 'hono'
import { z } from 'zod'

import {
  getMcpTools,
  invalidateAllMcpCache,
  invalidateMcpCache
} from '../../ai/mcp'
import {
  createMcpServer,
  deleteMcpServer,
  getAllMcpServers,
  getMcpServerById,
  updateMcpServer
} from '../../db/mcp-queries'
import { logger } from '../../logger'
import { maskMcpServer, mcpPlaintext, restoreMcpSecrets } from '../../secrets'
import { prepareMcpUpdate } from '../../secrets/at-rest'
import { Variables } from '../types'
import {
  deletionSuccessResponse,
  getRequiredParam,
  handleDatabaseOperation,
  successResponse,
  validateSchema
} from '../utils'

const mcp = new Hono<{ Variables: Variables }>()

const mcpServerSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  transportType: z.enum(['stdio', 'sse', 'streamable-http']).optional(),
  // stdio fields
  command: z.string().optional().nullable(),
  args: z.array(z.string()).optional().nullable(),
  env: z.record(z.string(), z.string()).optional().nullable(),
  // remote fields
  url: z.string().optional().nullable(),
  headers: z.record(z.string(), z.string()).optional().nullable(),
  // arbitrary extra fields merged into JSON export (e.g. oauth, httpUrl)
  extraConfig: z.record(z.string(), z.unknown()).optional().nullable(),
  isActive: z.boolean().optional()
})

mcp.get('/', async (c) => {
  const servers = await handleDatabaseOperation(
    () => getAllMcpServers(),
    'Failed to get MCP servers'
  )
  // `env` / `headers` values (and secret-named `extraConfig` values) leave as
  // masks only (spec 2026-09-25 §2.2); a posted mask means "unchanged".
  return successResponse(
    c,
    servers.map((s) => maskMcpServer(s))
  )
})

mcp.post('/', async (c) => {
  const data = validateSchema(
    mcpServerSchema,
    await c.req.json(),
    'Invalid MCP server data'
  )
  const result = await handleDatabaseOperation(
    () => createMcpServer(restoreMcpSecrets(data, mcpPlaintext(null))),
    'Failed to create MCP server'
  )
  invalidateAllMcpCache()
  return successResponse(c, result && maskMcpServer(result), 201)
})

mcp.put('/:id', async (c) => {
  const id = getRequiredParam(c, 'id')
  const data = validateSchema(
    mcpServerSchema.partial(),
    await c.req.json(),
    'Invalid MCP server data'
  )
  // Invalidate old name before update (name might change)
  const servers = await getAllMcpServers()
  const old = servers.find((s) => s.id === id)
  if (old) invalidateMcpCache(old.name)

  // Masked url / args / secrets posted back stand for the stored ones, but
  // no stored secret follows a move of its destination (prepareMcpUpdate).
  const stored = await getMcpServerById(id)
  const result = await handleDatabaseOperation(
    () => updateMcpServer(id, prepareMcpUpdate(data, stored)),
    'Failed to update MCP server'
  )
  if (data.name) invalidateMcpCache(data.name)
  return successResponse(c, result && maskMcpServer(result))
})

mcp.delete('/:id', async (c) => {
  const id = getRequiredParam(c, 'id')
  const servers = await getAllMcpServers()
  const target = servers.find((s) => s.id === id)

  await handleDatabaseOperation(
    () => deleteMcpServer(id),
    'Failed to delete MCP server'
  )
  if (target) invalidateMcpCache(target.name)
  return deletionSuccessResponse(c, 'MCP server')
})

// List available tools from all active MCP servers
mcp.get('/tools', async (c) => {
  try {
    const tools = await getMcpTools()
    return successResponse(c, {
      tools: tools.map((t) => ({
        mcpServerName: t.mcpServerName,
        tools: t.tools.map((tool) => ({
          name: tool.name,
          description: tool.description ?? ''
        }))
      }))
    })
  } catch (err) {
    logger.error('mcp', 'Failed to load MCP tools', {
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined
    })
    return successResponse(c, { tools: [] })
  }
})

export default mcp
