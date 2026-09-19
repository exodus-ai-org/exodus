/**
 * Contract of the skills integration seam (`main/lib/ai/skills/skills-manager`).
 *
 * The marketplace-era types (Convex API responses, registry search results,
 * the on-disk lockfile) were deliberately not migrated — skills is being
 * redone with a different design. Only what live consumers still need stays.
 */
export interface InstalledSkill {
  slug: string
  displayName: string
  version: string
  isActive: boolean
  installPath: string
  installedAt: number
}
