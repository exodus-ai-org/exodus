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

const skillsRouter = new Hono()

// List registry skills (paginated)
skillsRouter.get('/registry', async (c) => {
  const cursor = c.req.query('cursor')
  const data = await listRegistrySkills(cursor || undefined)
  return c.json({ ok: true, data })
})

// Search registry skills
skillsRouter.get('/search', async (c) => {
  const q = c.req.query('q') ?? ''
  const results = await searchRegistrySkills(q)
  return c.json({ ok: true, data: results })
})

// List installed skills
skillsRouter.get('/installed', async (c) => {
  const installed = await listInstalledSkills()
  return c.json({ ok: true, data: installed })
})

// Install a skill
skillsRouter.post('/install', async (c) => {
  const { slug, displayName, version } = await c.req.json()
  const installed = await installSkill(slug, displayName, version)
  return c.json({ ok: true, data: installed })
})

// Uninstall a skill
skillsRouter.delete('/:slug', async (c) => {
  const slug = c.req.param('slug')
  await uninstallSkill(slug)
  return c.json({ ok: true })
})

// Toggle skill active/inactive
skillsRouter.patch('/:slug/toggle', async (c) => {
  const slug = c.req.param('slug')
  const { isActive } = await c.req.json()
  await toggleSkillActive(slug, isActive)
  return c.json({ ok: true })
})

// Upload a local skill ZIP
skillsRouter.post('/upload', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']
  if (!file || typeof file === 'string') {
    return c.json({ ok: false, error: 'No file provided' }, 400)
  }
  const filename = file.name
  if (!filename.endsWith('.zip')) {
    return c.json({ ok: false, error: 'Only .zip files are accepted' }, 400)
  }
  try {
    const arrayBuffer = await file.arrayBuffer()
    const installed = await installLocalSkill(
      Buffer.from(arrayBuffer),
      filename
    )
    return c.json({ ok: true, data: installed })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to install skill'
    return c.json({ ok: false, error: msg }, 400)
  }
})

// Install from a local path (zip file or folder) — called after native dialog
skillsRouter.post('/install-path', async (c) => {
  const { path } = await c.req.json()
  if (!path || typeof path !== 'string') {
    return c.json({ ok: false, error: 'No path provided' }, 400)
  }
  try {
    const installed = await installFromPath(path)
    return c.json({ ok: true, data: installed })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to install skill'
    return c.json({ ok: false, error: msg }, 400)
  }
})

export default skillsRouter
