import { readFileSync } from 'fs'
import { join } from 'path'

import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..', '..', '..', '..')
const claudeMd = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8')
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const FORBIDDEN: RegExp[] = [
  /Vercel AI SDK/,
  /streamText/,
  /localhost:3000/,
  /~\/\.app\/Database/,
  /\/api\/setting\b/,
  /\/api\/workflow/,
  /\/api\/custom-uploader/,
  /calculator\.ts/,
  // Retired with the chat kernel (2026-09-22): the deprecated packages, the
  // message normaliser pi 0.85 made redundant, the MCP tool truncation cap.
  /@mariozechner\//,
  /transform-messages/,
  /MAX_TOOLS/
]

describe('CLAUDE.md staleness', () => {
  it('contains no retired tokens', () => {
    const hits = FORBIDDEN.filter((re) => re.test(claudeMd)).map(
      (re) => re.source
    )
    expect(
      hits,
      `retired tokens present in CLAUDE.md: ${hits.join(', ')}`
    ).toEqual([])
  })

  it('references the real AI dependency from package.json', () => {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    expect(deps['@earendil-works/pi-ai']).toBeTruthy()
    expect(claudeMd).toContain('@earendil-works/pi-ai')
  })
})
