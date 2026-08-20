import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..', '..', '..', '..')
const claudeMd = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8')

function codeStructureSection(md: string): string {
  const lines = md.split('\n')
  const start = lines.findIndex((l) => /^##\s+Code Structure\b/.test(l))
  if (start === -1) return ''
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) {
      end = i
      break
    }
  }
  return lines.slice(start, end).join('\n')
}

describe('CLAUDE.md code-structure freshness', () => {
  const section = codeStructureSection(claudeMd)

  it('has a Code Structure section', () => {
    expect(section.length).toBeGreaterThan(0)
  })

  it('every referenced repo path exists on disk', () => {
    const paths = [...section.matchAll(/`([^`]+)`/g)]
      .map((m) => m[1].trim())
      .filter((p) => !/[{}*,()<>\s]/.test(p))
      .filter(
        (p) =>
          /^(src|tests|resources|docs)\//.test(p) ||
          p === 'electron.vite.config.ts' ||
          p === 'vitest.config.ts' ||
          p === 'playwright.config.ts'
      )
      .map((p) => p.replace(/\/$/, ''))
    const missing = paths.filter((p) => !existsSync(join(ROOT, p)))
    expect(
      missing,
      `Code Structure references paths that don't exist: ${missing.join(', ')}`
    ).toEqual([])
  })
})
