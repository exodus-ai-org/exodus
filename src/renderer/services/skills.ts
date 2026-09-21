import type {
  InstalledSkill,
  SkillAuditResponse,
  SkillDetail,
  SkillListResponse,
  SkillSearchResponse,
  SkillsView
} from '@exodus/shared/types/skills'
import { fetcher } from '@exodus/shared/utils/http'
import { mutate } from 'swr'

const BASE = '/api/v1/skills'

export const REGISTRY_PAGE_SIZE = 24

/** SWR keys double as request URLs — keep them here so mutate() targets match. */
export const INSTALLED_SKILLS_KEY = `${BASE}/installed`
export const CURATED_KEY = `${BASE}/curated`

export function registryKey(view: SkillsView, page: number): string {
  return `${BASE}/registry?view=${view}&page=${page}&per_page=${REGISTRY_PAGE_SIZE}`
}

export function searchKey(query: string): string {
  return `${BASE}/search?q=${encodeURIComponent(query)}&limit=40`
}

export function detailKey(id: string): string {
  return `${BASE}/detail?id=${encodeURIComponent(id)}`
}

export function auditKey(id: string): string {
  return `${BASE}/audit?id=${encodeURIComponent(id)}`
}

export type { InstalledSkill, SkillAuditResponse, SkillDetail }
export type { SkillListResponse, SkillSearchResponse }

export async function installSkill(id: string): Promise<InstalledSkill> {
  const installed = await fetcher<InstalledSkill>(`${BASE}/install`, {
    method: 'POST',
    body: { id }
  })
  await mutate(INSTALLED_SKILLS_KEY)
  return installed
}

export async function uninstallSkill(slug: string): Promise<void> {
  await fetcher<{ success: true }>(`${BASE}/${encodeURIComponent(slug)}`, {
    method: 'DELETE'
  })
  await mutate(INSTALLED_SKILLS_KEY)
}

export async function toggleSkill(
  slug: string,
  isActive: boolean
): Promise<void> {
  await fetcher<{ success: true }>(
    `${BASE}/${encodeURIComponent(slug)}/toggle`,
    { method: 'PATCH', body: { isActive } }
  )
  await mutate(INSTALLED_SKILLS_KEY)
}

/** The exodus-cli equivalent of the Install button, shown on every detail page. */
export function cliInstallCommand(id: string): string {
  return `exodus skills install ${id}`
}
