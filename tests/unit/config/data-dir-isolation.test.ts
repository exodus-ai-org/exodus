import { tmpdir } from 'os'

import { describe, expect, it } from 'vitest'

describe('unit-test data dir isolation', () => {
  // Dev builds — and therefore any module that resolves getExodusHome() — use
  // the real ~/.exodus. vitest.config.ts points EXODUS_HOME at a scratch dir so
  // a test that forgets to mock db/db.ts can never open the user's database.
  it('runs with EXODUS_HOME pointing at a scratch dir, never the real ~/.exodus', () => {
    expect(process.env.EXODUS_HOME).toBeTruthy()
    expect(process.env.EXODUS_HOME!.startsWith(tmpdir())).toBe(true)
  })
})
