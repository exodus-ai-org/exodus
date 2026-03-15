import { app } from 'electron'
import { existsSync } from 'fs'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import JSZip from 'jszip'
import { join } from 'path'
import type {
  InstalledSkill,
  SearchResultItem,
  SkillItem,
  SkillsLockfile
} from '../../../../shared/types/skills'

const REGISTRY = 'https://clawhub.ai'
const LOCK_FILE = '.lock.json'

function getSkillsDir(): string {
  return join(app.getPath('userData'), 'skills')
}

function getLockfilePath(): string {
  return join(getSkillsDir(), LOCK_FILE)
}

async function readLockfile(): Promise<SkillsLockfile> {
  try {
    const raw = await readFile(getLockfilePath(), 'utf-8')
    return JSON.parse(raw) as SkillsLockfile
  } catch {
    return { skills: {} }
  }
}

async function writeLockfile(lock: SkillsLockfile): Promise<void> {
  await mkdir(getSkillsDir(), { recursive: true })
  await writeFile(getLockfilePath(), JSON.stringify(lock, null, 2), 'utf-8')
}

export async function listRegistrySkills(
  cursor?: string
): Promise<{ items: SkillItem[]; nextCursor: string | null }> {
  const url = new URL('/api/v1/skills', REGISTRY)
  url.searchParams.set('sort', 'downloads')
  if (cursor) url.searchParams.set('cursor', cursor)
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' }
  })
  if (!res.ok) throw new Error(`Failed to fetch skills: ${res.status}`)
  return res.json() as Promise<{
    items: SkillItem[]
    nextCursor: string | null
  }>
}

export async function searchRegistrySkills(
  q: string
): Promise<SearchResultItem[]> {
  const url = new URL('/api/v1/search', REGISTRY)
  url.searchParams.set('q', q)
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' }
  })
  if (!res.ok) throw new Error(`Failed to search skills: ${res.status}`)
  const data = (await res.json()) as { results: SearchResultItem[] }
  return data.results
}

export async function installSkill(
  slug: string,
  displayName: string,
  version: string
): Promise<InstalledSkill> {
  const skillsDir = getSkillsDir()
  const skillDir = join(skillsDir, slug)

  // Download ZIP
  const url = new URL('/api/v1/download', REGISTRY)
  url.searchParams.set('slug', slug)
  url.searchParams.set('version', version)
  const res = await fetch(url.toString())
  if (!res.ok)
    throw new Error(`Failed to download skill ${slug}: ${res.status}`)
  const zipBytes = await res.arrayBuffer()

  // Extract ZIP
  const zip = await JSZip.loadAsync(zipBytes)
  await mkdir(skillDir, { recursive: true })
  for (const [relativePath, file] of Object.entries(zip.files)) {
    if (file.dir) continue
    const targetPath = join(skillDir, relativePath)
    await mkdir(join(targetPath, '..'), { recursive: true })
    const content = await file.async('nodebuffer')
    await writeFile(targetPath, content)
  }

  // Update lockfile
  const lock = await readLockfile()
  const installed: Omit<InstalledSkill, 'slug'> = {
    displayName,
    version,
    isActive: true,
    installPath: skillDir,
    installedAt: Date.now()
  }
  lock.skills[slug] = installed
  await writeLockfile(lock)

  return { slug, ...installed }
}

export async function uninstallSkill(slug: string): Promise<void> {
  const lock = await readLockfile()
  const entry = lock.skills[slug]
  if (entry) {
    if (existsSync(entry.installPath)) {
      await rm(entry.installPath, { recursive: true, force: true })
    }
    delete lock.skills[slug]
    await writeLockfile(lock)
  }
}

export async function toggleSkillActive(
  slug: string,
  isActive: boolean
): Promise<void> {
  const lock = await readLockfile()
  if (lock.skills[slug]) {
    lock.skills[slug].isActive = isActive
    await writeLockfile(lock)
  }
}

export async function listInstalledSkills(): Promise<InstalledSkill[]> {
  const lock = await readLockfile()
  return Object.entries(lock.skills).map(([slug, info]) => ({ slug, ...info }))
}

export async function installLocalSkill(
  zipBuffer: Buffer,
  filename: string
): Promise<InstalledSkill> {
  // Derive slug from filename (e.g. "my-skill-v1.0.0.zip" → "my-skill")
  const baseName = filename.replace(/\.zip$/i, '')
  const slug = baseName.toLowerCase().replace(/[^a-z0-9-]/g, '-')

  const skillsDir = getSkillsDir()
  const skillDir = join(skillsDir, slug)

  // Duplicate check
  const lock = await readLockfile()
  if (lock.skills[slug]) {
    throw new Error(
      `A skill named "${slug}" is already installed. Uninstall it first or rename your zip file.`
    )
  }

  // Extract ZIP
  const zip = await JSZip.loadAsync(zipBuffer)
  await mkdir(skillDir, { recursive: true })
  for (const [relativePath, file] of Object.entries(zip.files)) {
    if (file.dir) continue
    const targetPath = join(skillDir, relativePath)
    await mkdir(join(targetPath, '..'), { recursive: true })
    const content = await file.async('nodebuffer')
    await writeFile(targetPath, content)
  }

  // Try to read display name from SKILL.md frontmatter
  let displayName = slug
  try {
    const skillMd = join(skillDir, 'SKILL.md')
    const content = await readFile(skillMd, 'utf-8')
    const nameMatch = content.match(/^---[\s\S]*?name:\s*(.+)/m)
    if (nameMatch) displayName = nameMatch[1].trim()
  } catch {
    // no SKILL.md or no name field, use slug
  }

  const installed: Omit<InstalledSkill, 'slug'> = {
    displayName,
    version: 'local',
    isActive: true,
    installPath: skillDir,
    installedAt: Date.now()
  }
  lock.skills[slug] = installed
  await writeLockfile(lock)

  return { slug, ...installed }
}

export async function getActiveSkillsContent(): Promise<string> {
  const lock = await readLockfile()
  const active = Object.entries(lock.skills).filter(([, info]) => info.isActive)
  const contents: string[] = []
  for (const [slug, info] of active) {
    try {
      const skillMd = join(info.installPath, 'SKILL.md')
      const content = await readFile(skillMd, 'utf-8')
      // Strip frontmatter
      const body = content.replace(/^---[\s\S]*?---\n?/, '').trim()
      if (body) contents.push(`<skill name="${slug}">\n${body}\n</skill>`)
    } catch {
      // skill file missing, skip
    }
  }
  return contents.length > 0
    ? `\n\n<active_skills>\n${contents.join('\n\n')}\n</active_skills>`
    : ''
}
