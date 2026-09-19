// src/main/lib/ai/skills/skills-manager.ts
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import { afterAll, describe, expect, it, vi } from 'vitest'

const skillsDir = mkdtempSync(join(tmpdir(), 'exodus-skills-manager-'))

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@main/lib/paths', () => ({ getSkillsDir: () => skillsDir }))

afterAll(() => rmSync(skillsDir, { recursive: true, force: true }))

function seed(slug: string, isActive: boolean, body: string) {
  const dir = join(skillsDir, slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'SKILL.md'), body)
  return {
    displayName: slug,
    version: 'v',
    isActive,
    installPath: dir,
    installedAt: 1
  }
}

describe('skills-manager (seam)', () => {
  it('renders active skills into an <active_skills> block with $SKILL_DIR baked in', async () => {
    const lock = {
      skills: {
        alpha: seed(
          'alpha',
          true,
          '---\nname: Alpha\n---\nRun $SKILL_DIR/go.sh\n'
        ),
        beta: seed('beta', false, '---\nname: Beta\n---\nBeta body\n'),
        empty: seed('empty', true, '---\nname: Empty\n---\n\n'),
        missing: {
          displayName: 'missing',
          version: 'v',
          isActive: true,
          installPath: join(skillsDir, 'nope'),
          installedAt: 1
        }
      }
    }
    writeFileSync(join(skillsDir, '.lock.json'), JSON.stringify(lock))

    const {
      getActiveSkillsContent,
      getSkillsContentBySlugs,
      listInstalledSkills
    } = await import('@main/lib/ai/skills/skills-manager')

    const active = await getActiveSkillsContent()
    expect(active.startsWith('\n\n<active_skills>\n')).toBe(true)
    expect(active).toContain(
      `<skill name="alpha">\nRun ${join(skillsDir, 'alpha')}/go.sh\n</skill>`
    )
    expect(active).not.toContain('name: Alpha') // frontmatter stripped
    expect(active).not.toContain('beta') // inactive
    expect(active).not.toContain('empty') // blank body skipped
    expect(active).not.toContain('missing') // no SKILL.md on disk

    // By-slug ignores the active flag (a Philharmonic agent's explicit pick)
    // and preserves the requested order.
    const bySlug = await getSkillsContentBySlugs(['beta', 'alpha', 'ghost'])
    expect(bySlug.indexOf('<skill name="beta">')).toBeLessThan(
      bySlug.indexOf('<skill name="alpha">')
    )
    expect(bySlug).not.toContain('ghost')

    expect(await getSkillsContentBySlugs([])).toBe('')
    expect((await listInstalledSkills()).map((s) => s.slug).sort()).toEqual([
      'alpha',
      'beta',
      'empty',
      'missing'
    ])
  })
})
