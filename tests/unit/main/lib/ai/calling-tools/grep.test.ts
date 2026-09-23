import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import { grep } from '@main/lib/ai/calling-tools/grep'
import { afterAll, describe, expect, it } from 'vitest'

const base = mkdtempSync(join(tmpdir(), 'exodus-grep-'))
writeFileSync(join(base, 'foobar.ts'), 'TARGET\n')
writeFileSync(join(base, 'nomatch.ts'), 'TARGET\n')
afterAll(() => rmSync(base, { recursive: true, force: true }))

describe('grep file_glob matching', () => {
  it('matches a file against a glob with more than one wildcard', async () => {
    const r = await grep.execute(
      't',
      { pattern: 'TARGET', path: base, file_glob: '*bar*' },
      undefined
    )
    const files = (r.details as { results: { file: string }[] }).results.map(
      (x) => x.file
    )
    expect(files).toContain(join(base, 'foobar.ts'))
    expect(files).not.toContain(join(base, 'nomatch.ts'))
  })
})
