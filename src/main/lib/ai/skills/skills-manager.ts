import type { InstalledSkill } from '@exodus/shared/types/skills'

/**
 * Skills integration seam.
 *
 * The upstream implementation (a hardcoded third-party Convex marketplace,
 * install/uninstall/search flows, jszip, an on-disk lockfile) was deliberately
 * not migrated: skills is being redone with a different design. Everything
 * that still consumes skills — the chat route, philharmonic's employee loop
 * and agent CRUD — goes through these three functions, so the replacement only
 * has to fill them in. Until then: no skills.
 */

/** Skills the user has installed, for pickers such as the agent editor. */
export function listInstalledSkills(): Promise<InstalledSkill[]> {
  return Promise.resolve([])
}

/**
 * Prompt block for the given skill slugs. An empty string means "nothing to
 * inject"; a real block is `\n\n<active_skills>…</active_skills>`.
 */
export function getSkillsContentBySlugs(_slugs: string[]): Promise<string> {
  return Promise.resolve('')
}

/** Prompt block for every currently-active skill, same shape as above. */
export function getActiveSkillsContent(): Promise<string> {
  return Promise.resolve('')
}
