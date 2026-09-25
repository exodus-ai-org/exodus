import {
  createProjectSchema,
  updateProjectSchema
} from '@exodus/shared/schemas/project-schema'
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
import { removeChatMedia } from '../../media/store'
import { resolveSearchProvider } from '../../search/resolve-search-provider'
import { Variables } from '../types'
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
  // Elasticsearch index has to be cascaded the same way `DELETE /api/v1/chat/:id`
  // does. Collect the chat ids first — after the delete they're gone.
  // Their generated media goes too, so the ids are needed either way.
  const { elasticsearch } = resolveSearchProvider(c.get('settings'))
  const projectChatIds = (
    await handleDatabaseOperation(
      () => getAllChats(id),
      'Failed to get project chats'
    )
  ).map((chat) => chat.id)

  await handleDatabaseOperation(
    () => deleteProject({ id }),
    'Failed to delete project'
  )

  for (const chatId of projectChatIds) await removeChatMedia(chatId)

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
