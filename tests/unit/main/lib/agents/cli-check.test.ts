// tests/unit/main/lib/agents/cli-check.test.ts
import { chmodSync, mkdtempSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import {
  checkCli,
  compareVersions,
  findOnPath,
  type CheckDeps
} from '@main/lib/agents/cli-check'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@main/lib/db/queries', () => ({ getSettings: vi.fn() }))
vi.mock('@main/lib/logger', () => ({ logger: { warn: vi.fn() } }))

function fakeBin(script: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'fake-cli-'))
  const file = join(dir, 'claude')
  writeFileSync(file, `#!/bin/sh\n${script}\n`)
  chmodSync(file, 0o755)
  return dir
}

const GOOD = `case "$1" in
  --version) echo "2.1.295 (Claude Code)";;
  auth) echo '{"loggedIn": true, "authMethod": "claude.ai", "apiProvider": "firstParty"}';;
esac`

function deps(dir: string, override: string | null = null): CheckDeps {
  const real = {
    env: async () => ({ PATH: `${dir}:/usr/bin:/bin` }),
    overridePath: async () => override
  }
  return {
    ...real,
    exec: async (file, args, env) => {
      const { execFile } = await import('child_process')
      return new Promise((resolve) => {
        execFile(file, args, { env, timeout: 5000 }, (err, stdout, stderr) => {
          const code = err ? (typeof err.code === 'number' ? err.code : -1) : 0
          resolve({
            code,
            stdout: String(stdout),
            stderr: String(stderr) || (err && !stdout ? err.message : '')
          })
        })
      })
    }
  }
}

describe('CLI check', () => {
  it('compares dotted versions numerically', () => {
    expect(compareVersions('2.1.294', '2.1.294')).toBe(0)
    expect(compareVersions('2.1.300', '2.1.294')).toBeGreaterThan(0)
    expect(compareVersions('2.0.999', '2.1.0')).toBeLessThan(0)
  })

  it('finds an executable on the PATH it is given, not the process PATH', async () => {
    const dir = fakeBin(GOOD)
    expect(await findOnPath('claude', `/nope:${dir}`)).toBe(join(dir, 'claude'))
    expect(await findOnPath('claude', '/nope')).toBeNull()
  })

  it('is ready when found, running, new enough and logged in', async () => {
    const dir = fakeBin(GOOD)
    const s = await checkCli('claude-code', deps(dir))
    expect(s).toMatchObject({
      state: 'ready',
      version: '2.1.295',
      authMethod: 'claude.ai',
      path: join(dir, 'claude')
    })
  })

  it('is not installed when nothing is found', async () => {
    const s = await checkCli('claude-code', deps('/nonexistent-dir'))
    expect(s).toMatchObject({ state: 'not_installed', path: null })
  })

  it('is broken when the launcher is there but its binary is gone (the machine’s Codex, 2026-10-09)', async () => {
    const dir = fakeBin('exec /nonexistent/vendor/claude "$@"')
    const s = await checkCli('claude-code', deps(dir))
    expect(s.state).toBe('broken')
    expect(s.detail).toMatch(/nonexistent/)
  })

  it('is too old below the tested minimum', async () => {
    const dir = fakeBin('echo "2.0.1 (Claude Code)"')
    const s = await checkCli('claude-code', deps(dir))
    expect(s).toMatchObject({ state: 'too_old', version: '2.0.1' })
  })

  it('is logged out when auth status says so', async () => {
    const dir = fakeBin(
      `case "$1" in --version) echo "2.1.294";; auth) echo '{"loggedIn": false}'; exit 1;; esac`
    )
    const s = await checkCli('claude-code', deps(dir))
    expect(s.state).toBe('logged_out')
  })

  it("uses the owner's path when set, even off the PATH", async () => {
    const dir = fakeBin(GOOD)
    const s = await checkCli(
      'claude-code',
      deps('/nonexistent-dir', join(dir, 'claude'))
    )
    expect(s.state).toBe('ready')
  })
})
