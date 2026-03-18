// ─── Convex API response types ──────────────────────────────────────────────

export interface ConvexSkillOwner {
  _id: string
  displayName: string
  handle: string
  image: string
  name: string
}

export interface ConvexSkillVersion {
  _id: string
  version: string
  changelog?: string
  changelogSource?: string
  createdAt: number
}

export interface ConvexSkillEntry {
  skill: {
    _id: string
    slug: string
    displayName: string
    summary?: string | null
    stats?: {
      downloads?: number
      stars?: number
      installsAllTime?: number
      installsCurrent?: number
      comments?: number
      versions?: number
    }
    badges?: Record<string, unknown>
    tags?: Record<string, string>
    createdAt?: number
    updatedAt?: number
  }
  owner: ConvexSkillOwner
  ownerHandle: string
  latestVersion: ConvexSkillVersion | null
}

export interface ConvexListResponse {
  status: string
  value: {
    hasMore: boolean
    nextCursor: string | null
    page: ConvexSkillEntry[]
  }
}

// ─── App-level types ────────────────────────────────────────────────────────

export interface SkillItem {
  slug: string
  displayName: string
  summary?: string | null
  ownerHandle?: string
  ownerImage?: string
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
