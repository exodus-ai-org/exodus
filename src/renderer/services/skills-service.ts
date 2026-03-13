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

export type { InstalledSkill, SearchResultItem, SkillItem }
