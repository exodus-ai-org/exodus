import { Hono } from 'hono'
import {
  installSkill,
  listInstalledSkills,
  listRegistrySkills,
  searchRegistrySkills,
  toggleSkillActive,
  uninstallSkill
} from '../../skills/skills-manager'

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

export default skillsRouter
