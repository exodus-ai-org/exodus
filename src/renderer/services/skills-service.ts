import { BASE_URL } from '@shared/constants/systems'
import type {
  InstalledSkill,
  SearchResultItem,
  SkillItem
} from '@shared/types/skills'

const base = `${BASE_URL}/api/skills`

export async function installSkill(
  slug: string,
  displayName: string,
  version: string
): Promise<InstalledSkill> {
  const res = await fetch(`${base}/install`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, displayName, version })
  })
  const data = await res.json()
  if (!data.ok) throw new Error('Install failed')
  return data.data
}

export async function uninstallSkill(slug: string): Promise<void> {
  await fetch(`${base}/${slug}`, { method: 'DELETE' })
}

export async function toggleSkill(
  slug: string,
  isActive: boolean
): Promise<void> {
  await fetch(`${base}/${slug}/toggle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive })
  })
}

export async function uploadLocalSkill(file: File): Promise<InstalledSkill> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${base}/upload`, { method: 'POST', body: form })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error ?? 'Upload failed')
  return data.data
}

export async function installFromLocalPath(
  path: string
): Promise<InstalledSkill> {
  const res = await fetch(`${base}/install-path`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path })
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error ?? 'Install failed')
  return data.data
}

export type { InstalledSkill, SearchResultItem, SkillItem }
