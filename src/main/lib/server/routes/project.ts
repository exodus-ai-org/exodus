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
import { getAllChats } from '../../db/queries'
import { logger } from '../../logger'
import { resolveSearchProvider } from '../../search/resolve-search-provider'
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

  // `deleteProject()` also deletes every child chat's messages, so the
  // Elasticsearch index has to be cascaded the same way `DELETE /api/chat/:id`
  // does. Collect the chat ids first — after the delete they're gone.
  const { elasticsearch } = resolveSearchProvider(c.get('settings'))
  const projectChatIds = elasticsearch
    ? (
        await handleDatabaseOperation(
          () => getAllChats(id),
          'Failed to get project chats'
        )
      ).map((chat) => chat.id)
    : []

  await handleDatabaseOperation(
    () => deleteProject({ id }),
    'Failed to delete project'
  )

  if (elasticsearch) {
    for (const chatId of projectChatIds) {
      elasticsearch.deleteByChatId(chatId).catch((error) => {
        logger.error('search', 'Failed to delete chat from Elasticsearch', {
          error: String(error)
        })
      })
    }
  }

  return deletionSuccessResponse(c, 'project')
})

export default projectRouter
