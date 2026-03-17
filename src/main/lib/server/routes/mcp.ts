import { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import { z } from 'zod'
import {
  createMcpServer,
  deleteMcpServer,
  getAllMcpServers,
  updateMcpServer
} from '../../db/mcp-queries'
import {
  getRequiredParam,
  handleDatabaseOperation,
  successResponse,
  validateSchema
} from '../utils'

const mcp = new Hono<{ Variables: Variables }>()

const mcpServerSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional().nullable(),
  isActive: z.boolean().optional()
})

mcp.get('/', async (c) => {
  const servers = await handleDatabaseOperation(
    () => getAllMcpServers(),
    'Failed to get MCP servers'
  )
  return successResponse(c, servers)
})

mcp.post('/', async (c) => {
  const data = validateSchema(
    mcpServerSchema,
    await c.req.json(),
    'mcp',
    'Invalid MCP server data'
  )
  const result = await handleDatabaseOperation(
    () => createMcpServer(data),
    'Failed to create MCP server'
  )
  return successResponse(c, result, 201)
})

mcp.put('/:id', async (c) => {
  const id = getRequiredParam(c, 'id', 'mcp')
  const data = validateSchema(
    mcpServerSchema.partial(),
    await c.req.json(),
    'mcp',
    'Invalid MCP server data'
  )
  const result = await handleDatabaseOperation(
    () => updateMcpServer(id, data),
    'Failed to update MCP server'
  )
  return successResponse(c, result)
})

mcp.delete('/:id', async (c) => {
  const id = getRequiredParam(c, 'id', 'mcp')
  await handleDatabaseOperation(
    () => deleteMcpServer(id),
    'Failed to delete MCP server'
  )
  return c.text('MCP server deleted successfully', 200)
})

export default mcp
