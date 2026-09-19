import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..', '..', '..')
const SRC = join(ROOT, 'src', 'renderer')

function filesUnder(dir: string, exts: string[]): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((p) => exts.some((e) => p.endsWith(e)))
    .map((p) => join(dir, p))
}

describe('getHttpErrorMessage call-site linkage', () => {
  it('every call site passes an i18n argument (no bare single-argument call)', () => {
    const bareCall = /getHttpErrorMessage\(\s*[A-Za-z0-9_.]+\s*\)/g
    const offenders: string[] = []
    for (const file of filesUnder(SRC, ['.tsx', '.ts'])) {
      const text = readFileSync(file, 'utf8')
      for (const match of text.matchAll(bareCall)) {
        offenders.push(`${file}: ${match[0]}`)
      }
    }
    expect(
      offenders,
      `bare single-argument getHttpErrorMessage() calls found (missing the i18n argument): ${offenders.join(', ')}`
    ).toEqual([])
  })
})
