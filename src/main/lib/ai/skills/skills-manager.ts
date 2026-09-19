import { readFile } from 'fs/promises'
import { join } from 'path'

import type { InstalledSkill } from '@exodus/shared/types/skills'

import {
  listInstalledSkills as listFromStore,
  readLockfile
} from './skills-store'

/**
 * Skills integration seam — what the chat route, Philharmonic's employee loop
 * and the agent CRUD route consume. Backed by the skills.sh install store
 * (`skills-store.ts`); the marketplace itself lives behind `/api/v1/skills`.
 */

/** Skills the user has installed, for pickers such as the agent editor. */
export function listInstalledSkills(): Promise<InstalledSkill[]> {
  return listFromStore()
}

/**
 * Reads a skill's SKILL.md into a `<skill>` block: frontmatter stripped, and
 * `$SKILL_DIR` / `${SKILL_DIR}` replaced with the absolute install path —
 * skills reference bundled scripts through that variable, but the terminal
 * tool runs raw shell with nothing pre-set, so the model needs ready-to-run
 * absolute paths. Missing or empty SKILL.md → `null` (the skill is skipped).
 */
async function renderSkillBlock(
  slug: string,
  installPath: string
): Promise<string | null> {
  try {
    const content = await readFile(join(installPath, 'SKILL.md'), 'utf-8')
    const body = content
      .replace(/^---[\s\S]*?---\n?/, '')
      .replace(/\$\{SKILL_DIR\}|\$SKILL_DIR/g, installPath)
      .trim()
    return body ? `<skill name="${slug}">\n${body}\n</skill>` : null
  } catch {
    return null
  }
}

async function renderSkillsSection(
  entries: Array<{ slug: string; installPath: string }>
): Promise<string> {
  const blocks: string[] = []
  for (const { slug, installPath } of entries) {
    const block = await renderSkillBlock(slug, installPath)
    if (block) blocks.push(block)
  }
  return blocks.length > 0
    ? `\n\n<active_skills>\n${blocks.join('\n\n')}\n</active_skills>`
    : ''
}

/**
 * Prompt block for the given skill slugs (a Philharmonic agent's picks),
 * regardless of their active flag. An empty string means "nothing to
 * inject"; a real block is `\n\n<active_skills>…</active_skills>`.
 */
export async function getSkillsContentBySlugs(
  slugs: string[]
): Promise<string> {
  const lock = await readLockfile()
  const entries = slugs.flatMap((slug) => {
    const info = lock.skills[slug]
    return info ? [{ slug, installPath: info.installPath }] : []
  })
  return renderSkillsSection(entries)
}

/** Prompt block for every currently-active skill, same shape as above. */
export async function getActiveSkillsContent(): Promise<string> {
  const lock = await readLockfile()
  const entries = Object.entries(lock.skills)
    .filter(([, info]) => info.isActive)
    .map(([slug, info]) => ({ slug, installPath: info.installPath }))
  return renderSkillsSection(entries)
}
