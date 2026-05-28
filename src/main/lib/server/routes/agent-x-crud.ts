// src/main/lib/server/routes/agent-x-crud.ts
import type { Variables } from '@shared/types/server'
import { Hono } from 'hono'
import { z } from 'zod'

import { listInstalledSkills } from '../../ai/skills/skills-manager'
import {
  createAgent,
  deleteAgent,
  getAgentMemories,
  getAllAgents,
  updateAgent
} from '../../db/agent-x-queries'
import {
  getRequiredParam,
  handleDatabaseOperation,
  successResponse,
  validateSchema
} from '../utils'

const agentXCrud = new Hono<{ Variables: Variables }>()

const employeeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  team: z.string().optional().nullable(),
  avatarSeed: z.string().optional().nullable(),
  avatarStyle: z.string().optional().nullable(),
  systemPrompt: z.string().optional(),
  toolAllowList: z.array(z.string()).optional(),
  skillSlugs: z.array(z.string()).optional(),
  mcpServerNames: z.array(z.string()).optional(),
  model: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  isActive: z.boolean().optional()
})

agentXCrud.get('/agents', async (c) =>
  successResponse(
    c,
    await handleDatabaseOperation(
      () => getAllAgents(),
      'Failed to get employees'
    )
  )
)

agentXCrud.post('/agents', async (c) => {
  const data = validateSchema(
    employeeSchema,
    await c.req.json(),
    'Invalid employee data'
  )
  return successResponse(
    c,
    await handleDatabaseOperation(
      () => createAgent(data),
      'Failed to create employee'
    ),
    201
  )
})

agentXCrud.put('/agents/:id', async (c) => {
  const id = getRequiredParam(c, 'id')
  const data = validateSchema(
    employeeSchema.partial(),
    await c.req.json(),
    'Invalid employee data'
  )
  return successResponse(
    c,
    await handleDatabaseOperation(
      () => updateAgent(id, data),
      'Failed to update employee'
    )
  )
})

agentXCrud.delete('/agents/:id', async (c) => {
  await handleDatabaseOperation(
    () => deleteAgent(getRequiredParam(c, 'id')),
    'Failed to delete employee'
  )
  return c.text('Employee deleted', 200)
})

agentXCrud.get('/agents/:id/memories', async (c) =>
  successResponse(c, await getAgentMemories(getRequiredParam(c, 'id')))
)

agentXCrud.get('/available-skills', async (c) => {
  const skills = await listInstalledSkills()
  return successResponse(
    c,
    skills.map((s) => ({
      slug: s.slug,
      name: s.displayName,
      isActive: s.isActive
    }))
  )
})

export default agentXCrud
