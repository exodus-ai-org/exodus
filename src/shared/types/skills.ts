export interface SkillItem {
  slug: string
  displayName: string
  summary?: string | null
  tags?: Record<string, string>
  stats?: {
    downloads?: number
    stars?: number
    installsAllTime?: number
  }
  createdAt?: number
  updatedAt?: number
  latestVersion?: {
    version: string
    changelog?: string
  } | null
}

export interface SearchResultItem {
  slug?: string
  displayName?: string
  summary?: string | null
  version?: string | null
  score: number
}

export interface InstalledSkill {
  slug: string
  displayName: string
  version: string
  isActive: boolean
  installPath: string
  installedAt: number
}

export interface SkillsLockfile {
  skills: Record<string, Omit<InstalledSkill, 'slug'>>
}
