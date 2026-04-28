import {
  createProjectSchema,
  updateProjectSchema
} from '@shared/schemas/project-schema'
import { Variables } from '@shared/types/server'
import { Hono } from 'hono'

import {
  createProject,
  deleteProject,
  getAllProjects,
  getProjectWithCounts,
  updateProject
} from '../../db/project-queries'
import {
  deletionSuccessResponse,
  getRequiredParam,
  handleDatabaseOperation,
  successResponse,
  validateSchema
} from '../utils'

const projectRouter = new Hono<{ Variables: Variables }>()

projectRouter.get('/', async (c) => {
  const projects = await handleDatabaseOperation(
    () => getAllProjects(),
    'Failed to get projects'
  )
  return successResponse(c, projects)
})

projectRouter.get('/:id', async (c) => {
  const id = getRequiredParam(c, 'id')
  const project = await handleDatabaseOperation(
    () => getProjectWithCounts({ id }),
    'Failed to get project'
  )
  return successResponse(c, project)
})

projectRouter.post('/', async (c) => {
  const body = validateSchema(
    createProjectSchema,
    await c.req.json(),
    'Invalid project data'
  )
  const project = await handleDatabaseOperation(
    () => createProject(body),
    'Failed to create project'
  )
  return successResponse(c, project)
})

projectRouter.put('/:id', async (c) => {
  const id = getRequiredParam(c, 'id')
  const body = validateSchema(
    updateProjectSchema,
    await c.req.json(),
    'Invalid project data'
  )
  const project = await handleDatabaseOperation(
    () => updateProject({ id, ...body }),
    'Failed to update project'
  )
  return successResponse(c, project)
})

projectRouter.delete('/:id', async (c) => {
  const id = getRequiredParam(c, 'id')
  await handleDatabaseOperation(
    () => deleteProject({ id }),
    'Failed to delete project'
  )
  return deletionSuccessResponse(c, 'project')
})

export default projectRouter
