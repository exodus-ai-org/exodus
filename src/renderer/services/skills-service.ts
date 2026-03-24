import type {
  InstalledSkill,
  SearchResultItem,
  SkillItem
} from '@shared/types/skills'
import { fetcher } from '@shared/utils/http'

const base = '/api/skills'

export async function installSkill(
  slug: string,
  displayName: string,
  version: string
): Promise<InstalledSkill> {
  return fetcher<InstalledSkill>(`${base}/install`, {
    method: 'POST',
    body: { slug, displayName, version }
  })
}

export async function uninstallSkill(slug: string): Promise<void> {
  await fetcher<void>(`${base}/${slug}`, { method: 'DELETE' })
}

export async function toggleSkill(
  slug: string,
  isActive: boolean
): Promise<void> {
  await fetcher<void>(`${base}/${slug}/toggle`, {
    method: 'PATCH',
    body: { isActive }
  })
}

export async function uploadLocalSkill(file: File): Promise<InstalledSkill> {
  const form = new FormData()
  form.append('file', file)
  return fetcher<InstalledSkill>(`${base}/upload`, {
    method: 'POST',
    body: form as never
  })
}

export async function installFromLocalPath(
  path: string
): Promise<InstalledSkill> {
  return fetcher<InstalledSkill>(`${base}/install-path`, {
    method: 'POST',
    body: { path }
  })
}

export type { InstalledSkill, SearchResultItem, SkillItem }
