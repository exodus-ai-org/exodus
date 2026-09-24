// Secrets that ride inside an MCP server's `url` or `args` (review S1 I2):
// userinfo, secret-named query values, capability path segments, and
// `--token` / `--api-key=` / `--header "Authorization: …"` arguments leave as
// masks; a posted url / args equal to the stored one's mask keeps the stored.
import { describe, expect, it } from 'vitest'

const { maskMcpUrl, maskMcpArgs, restoreMcpLocators } =
  await import('@main/lib/secrets')
const { isSecretName } = await import('@main/lib/secrets/registry')

describe('maskMcpUrl', () => {
  it('masks userinfo', () => {
    expect(
      maskMcpUrl('https://alice:hunter2-long-pass@mcp.example.com/sse')
    ).toBe('https://••••@mcp.example.com/sse')
  })

  it('masks secret-named query values and keeps the rest', () => {
    expect(
      maskMcpUrl(
        'https://mcp.example.com/mcp?api_key=sk-live-abcdef123456&region=eu&token=short'
      )
    ).toBe('https://mcp.example.com/mcp?api_key=•••• 3456&region=eu&token=••••')
  })

  it('masks a capability path segment', () => {
    expect(
      maskMcpUrl(
        'https://mcp.zapier.com/api/mcp/s/Zk3q9XbT7mW2pL8vR4nY6cA1/mcp'
      )
    ).toBe('https://mcp.zapier.com/api/mcp/s/•••• 6cA1/mcp')
  })

  it('leaves a URL with nothing secret in it alone', () => {
    for (const url of [
      'https://mcp.example.com/sse',
      'http://localhost:3000/mcp?region=eu&verbose=1',
      // Long but all letters, or all digits: a slug or an id, not a key.
      'https://example.com/docs/model-context-protocol-servers/overview',
      'https://example.com/items/123456789012345678901234567890',
      'not a url at all'
    ]) {
      expect(maskMcpUrl(url)).toBe(url)
    }
    expect(maskMcpUrl(null)).toBeNull()
  })
})

describe('maskMcpArgs', () => {
  it('masks the value of a secret flag, in both forms', () => {
    expect(
      maskMcpArgs([
        '--api-key=sk-live-abcdef123456',
        '--token',
        'ghp_abcdefghij1234',
        '--secret',
        'x',
        '--password=hunter2'
      ])
    ).toEqual([
      '--api-key=•••• 3456',
      '--token',
      '•••• 1234',
      '--secret',
      '••••',
      '--password=••••'
    ])
  })

  it('masks a secret header value, in both forms', () => {
    expect(
      maskMcpArgs([
        'mcp-remote',
        'https://mcp.example.com/sse',
        '--header',
        'Authorization: Bearer abcdefghijklmnop',
        '--header=X-Api-Key: key-0123456789ab',
        '--header',
        'Cookie:session=abcdefghijklmnopqrst',
        '--header',
        'Accept: text/event-stream'
      ])
    ).toEqual([
      'mcp-remote',
      'https://mcp.example.com/sse',
      '--header',
      'Authorization: •••• mnop',
      '--header=X-Api-Key: •••• 89ab',
      '--header',
      'Cookie: •••• qrst',
      '--header',
      'Accept: text/event-stream'
    ])
  })

  it('masks secrets in a URL argument', () => {
    expect(
      maskMcpArgs(['mcp-remote', 'https://u:pass-word-long@host.example/sse'])
    ).toEqual(['mcp-remote', 'https://••••@host.example/sse'])
  })

  it('leaves an env reference and ordinary arguments alone', () => {
    const args = [
      '-y',
      '@modelcontextprotocol/server-filesystem',
      '/Users/me/Documents',
      '--header',
      'Authorization:${AUTH_HEADER}',
      '--token',
      '$GITHUB_TOKEN',
      '--port',
      '8080'
    ]
    expect(maskMcpArgs(args)).toEqual(args)
  })
})

describe('restoreMcpLocators', () => {
  const stored = {
    url: 'https://mcp.example.com/mcp?api_key=sk-live-abcdef123456',
    args: ['--token', 'ghp_abcdefghij1234', '--verbose']
  }

  it('keeps the stored url / args when they come back as their masks', () => {
    const out = restoreMcpLocators(
      { url: maskMcpUrl(stored.url), args: maskMcpArgs(stored.args) },
      stored
    )
    expect(out).toEqual(stored)
  })

  it('sets a real change', () => {
    const out = restoreMcpLocators(
      {
        url: 'https://other.example.com/mcp?api_key=sk-new-000000000000',
        args: ['--token', 'ghp_newvalue00001234']
      },
      stored
    )
    expect(out.url).toBe(
      'https://other.example.com/mcp?api_key=sk-new-000000000000'
    )
    expect(out.args).toEqual(['--token', 'ghp_newvalue00001234'])
  })

  it('leaves unsent fields unsent and a create alone', () => {
    expect(restoreMcpLocators({ name: 'x' }, stored)).toEqual({ name: 'x' })
    expect(restoreMcpLocators({ url: 'https://a.example' }, null)).toEqual({
      url: 'https://a.example'
    })
  })
})

describe('isSecretName', () => {
  it('matches key-like names', () => {
    for (const name of [
      'apiKey',
      'api_key',
      'X-API-KEY',
      'APIKey',
      'accessKeyId',
      'clientSecret',
      'password',
      'GITHUB_TOKEN',
      'tokens',
      'auth',
      'Authorization',
      'authentication',
      'bearer',
      'credentials',
      'cookie',
      'pat',
      'githubPat',
      'session',
      'sessionId'
    ]) {
      expect(isSecretName(name), name).toBe(true)
    }
  })

  it('does not over-match obvious non-secrets', () => {
    for (const name of [
      'author',
      'authority',
      'oauth',
      'path',
      'patch',
      'pattern',
      'keyboardShortcuts',
      'keyword',
      'url',
      'clientId',
      'timeout'
    ]) {
      expect(isSecretName(name), name).toBe(false)
    }
  })
})
