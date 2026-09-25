// src/main/lib/secrets/values.ts — which MCP values the logger (and the
// Chat Audit / purge copies) are scrubbed of. Re-review m5: every env value
// used to count, so `PATH` and home directories were masked in every line.
import { describe, expect, it } from 'vitest'

const { mcpServerSecretValues } = await import('@main/lib/secrets/values')
const { resetLogSecretsForTests, addLogSecrets, maskLogText } =
  await import('@main/lib/logger/secret-mask')

const server = (env: Record<string, string>) => ({
  env,
  headers: null,
  extraConfig: null,
  url: null,
  args: null
})

describe('mcpServerSecretValues: env', () => {
  it('keeps every value under a secret name, whatever its shape', () => {
    const values = mcpServerSecretValues(
      server({
        GITHUB_PERSONAL_ACCESS_TOKEN: 'ghp_abcdefghij1234567890',
        DB_PASSWORD: '12345678',
        API_KEY: 'short'
      })
    )
    expect(values).toEqual(
      expect.arrayContaining(['ghp_abcdefghij1234567890', '12345678', 'short'])
    )
  })

  it('keeps a token-shaped value under any other name', () => {
    expect(
      mcpServerSecretValues(server({ OPENAI: 'sk-proj-abc123def456ghi789' }))
    ).toEqual(['sk-proj-abc123def456ghi789'])
  })

  it('leaves PATH, HOME and other plain settings out', () => {
    expect(
      mcpServerSecretValues(
        server({
          PATH: '/usr/local/bin:/usr/bin:/bin',
          HOME: '/Users/someone/projects',
          NODE_ENV: 'production',
          LOG_LEVEL: 'debug',
          PORT: '3000',
          REGION: 'eu-central-1'
        })
      )
    ).toEqual([])
  })

  it('the logger no longer rewrites paths in every line', () => {
    resetLogSecretsForTests()
    addLogSecrets(
      mcpServerSecretValues(
        server({
          HOME: '/Users/someone/projects',
          GITHUB_TOKEN: 'ghp_abcdefghij1234567890'
        })
      )
    )
    expect(
      maskLogText(
        'cwd /Users/someone/projects/x token ghp_abcdefghij1234567890'
      )
    ).toBe('cwd /Users/someone/projects/x token •••• 7890')
    resetLogSecretsForTests()
  })
})
