import { Hono } from 'hono'

import {
  installFromPath,
  installLocalSkill,
  installSkill,
  listInstalledSkills,
  listRegistrySkills,
  searchRegistrySkills,
  toggleSkillActive,
  uninstallSkill
} from '../../ai/skills/skills-manager'
import { ChatSDKError } from '../errors'
import { successResponse } from '../utils'

const skillsRouter = new Hono()

// List registry skills (paginated)
skillsRouter.get('/registry', async (c) => {
  try {
    const cursor = c.req.query('cursor')
    const data = await listRegistrySkills(cursor || undefined)
    return successResponse(c, {
      items: data.items,
      nextCursor: data.nextCursor
    })
  } catch (e) {
    if (e instanceof ChatSDKError) throw e
    throw new ChatSDKError(
      'bad_request:skills',
      e instanceof Error ? e.message : 'Failed to list skills'
    )
  }
})

// Search registry skills
skillsRouter.get('/search', async (c) => {
  try {
    const q = c.req.query('q') ?? ''
    const results = await searchRegistrySkills(q)
    return successResponse(c, results)
  } catch (e) {
    if (e instanceof ChatSDKError) throw e
    throw new ChatSDKError(
      'bad_request:skills',
      e instanceof Error ? e.message : 'Failed to search skills'
    )
  }
})

// List installed skills
skillsRouter.get('/installed', async (c) => {
  try {
    const installed = await listInstalledSkills()
    return successResponse(c, installed)
  } catch (e) {
    if (e instanceof ChatSDKError) throw e
    throw new ChatSDKError(
      'bad_request:skills',
      e instanceof Error ? e.message : 'Failed to list installed skills'
    )
  }
})

// Install a skill
skillsRouter.post('/install', async (c) => {
  const { slug, displayName, version } = await c.req.json()
  try {
    const installed = await installSkill(slug, displayName, version)
    return successResponse(c, installed)
  } catch (e) {
    if (e instanceof ChatSDKError) throw e
    const message = e instanceof Error ? e.message : 'Failed to install skill'
    // Detect rate limit from upstream
    if (message.includes('429')) {
      throw new ChatSDKError('rate_limit:skills', message)
    }
    throw new ChatSDKError('bad_request:skills', message)
  }
})

// Uninstall a skill
skillsRouter.delete('/:slug', async (c) => {
  const slug = c.req.param('slug')
  try {
    await uninstallSkill(slug)
    return c.json({ success: true })
  } catch (e) {
    if (e instanceof ChatSDKError) throw e
    throw new ChatSDKError(
      'bad_request:skills',
      e instanceof Error ? e.message : 'Failed to uninstall skill'
    )
  }
})

// Toggle skill active/inactive
skillsRouter.patch('/:slug/toggle', async (c) => {
  const slug = c.req.param('slug')
  const { isActive } = await c.req.json()
  try {
    await toggleSkillActive(slug, isActive)
    return c.json({ success: true })
  } catch (e) {
    if (e instanceof ChatSDKError) throw e
    throw new ChatSDKError(
      'bad_request:skills',
      e instanceof Error ? e.message : 'Failed to toggle skill'
    )
  }
})

// Upload a local skill ZIP
skillsRouter.post('/upload', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']
  if (!file || typeof file === 'string') {
    throw new ChatSDKError('bad_request:skills', 'No file provided')
  }
  const filename = file.name
  if (!filename.endsWith('.zip')) {
    throw new ChatSDKError('bad_request:skills', 'Only .zip files are accepted')
  }
  try {
    const arrayBuffer = await file.arrayBuffer()
    const installed = await installLocalSkill(
      Buffer.from(arrayBuffer),
      filename
    )
    return successResponse(c, installed)
  } catch (e) {
    if (e instanceof ChatSDKError) throw e
    throw new ChatSDKError(
      'bad_request:skills',
      e instanceof Error ? e.message : 'Failed to install skill'
    )
  }
})

// Install from a local path (zip file or folder) — called after native dialog
skillsRouter.post('/install-path', async (c) => {
  const { path } = await c.req.json()
  if (!path || typeof path !== 'string') {
    throw new ChatSDKError('bad_request:skills', 'No path provided')
  }
  try {
    const installed = await installFromPath(path)
    return successResponse(c, installed)
  } catch (e) {
    if (e instanceof ChatSDKError) throw e
    throw new ChatSDKError(
      'bad_request:skills',
      e instanceof Error ? e.message : 'Failed to install skill'
    )
  }
})

export default skillsRouter
