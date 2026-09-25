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
      'Authorization: Bearer •••• mnop',
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

describe('maskMcpArgs, round 2 (N3 + minors)', () => {
  it('masks a URL given as an inline flag value', () => {
    expect(
      maskMcpArgs([
        '--url=https://h.example/sse?api_key=abcdefghij1234',
        '--connection-string=postgresql://u:PW-long-password@db/x'
      ])
    ).toEqual([
      '--url=https://h.example/sse?api_key=•••• 1234',
      '--connection-string=postgresql://••••@db/x'
    ])
  })

  it('masks NAME=value arguments with a secret name', () => {
    expect(
      maskMcpArgs([
        '-e',
        'GITHUB_PERSONAL_ACCESS_TOKEN=ghp_abcdefghij1234',
        '--env',
        'API_KEY=sk-abcdefghijkl9999',
        'API_KEY2=short',
        'PATH=/usr/bin',
        '--env=OPENAI_API_KEY=sk-inline-00000QQQQ'
      ])
    ).toEqual([
      '-e',
      'GITHUB_PERSONAL_ACCESS_TOKEN=•••• 1234',
      '--env',
      'API_KEY=•••• 9999',
      'API_KEY2=••••',
      'PATH=/usr/bin',
      '--env=OPENAI_API_KEY=•••• QQQQ'
    ])
  })

  it('masks -HName: value and --headers', () => {
    expect(
      maskMcpArgs([
        '-HAuthorization: Bearer abcdefghijklmnop',
        '--headers',
        'X-Api-Key: key-0123456789ab'
      ])
    ).toEqual([
      '-HAuthorization: Bearer •••• mnop',
      '--headers',
      'X-Api-Key: •••• 89ab'
    ])
  })

  it('masks -p only after a user flag, since -p is usually a port', () => {
    expect(maskMcpArgs(['-u', 'root', '-p', 'hunter2-password'])).toEqual([
      '-u',
      'root',
      '-p',
      '•••• word'
    ])
    expect(maskMcpArgs(['-p', '8080'])).toEqual(['-p', '8080'])
    expect(maskMcpArgs(['--port', '3000', '-p', '8080'])).toEqual([
      '--port',
      '3000',
      '-p',
      '8080'
    ])
  })
})

describe('maskMcpUrl, round 2', () => {
  it('masks a long mixed base64-ish capability segment', () => {
    expect(
      maskMcpUrl('https://h.example/s/QWxhZGRpbjpvcGVuIHNlc2FtZQ1234abcd==/mcp')
    ).toBe('https://h.example/s/•••• cd==/mcp')
  })

  it('leaves a long dotted file name with no digits alone', () => {
    const url = 'https://example.com/docs/model-context-protocol.overview.html'
    expect(maskMcpUrl(url)).toBe(url)
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
      'sessionId',
      'pass',
      'passwd',
      'passphrase',
      'jwt',
      'sig',
      'signature',
      'apiKey2',
      'API_KEY2',
      'keys',
      'apikeys'
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
      'timeout',
      'signal',
      'passenger',
      'bypass',
      'compass'
    ]) {
      expect(isSecretName(name), name).toBe(false)
    }
  })
})

describe('fewer false positives, and no misses (S1 M-a, M-d, M-e)', () => {
  it('does not mask a token budget, a session name or a version', () => {
    const args = [
      '--max-tokens',
      '4096',
      '--token-limit=8000',
      '--session-name',
      'work',
      '--signature-version',
      'v4',
      '--pass-through'
    ]
    expect(maskMcpArgs(args)).toEqual(args)
    for (const name of [
      'max-tokens',
      'maxTokens',
      'MAX_TOKENS',
      'token_limit',
      'sessionName',
      'signature-version',
      'passThrough'
    ]) {
      expect(isSecretName(name)).toBe(false)
    }
  })

  it('a setting whose name only looks secret is listed, and stays visible', () => {
    expect(maskMcpArgs(['--session-timeout', '30'])).toEqual([
      '--session-timeout',
      '30'
    ])
    // A real secret under a secret name is masked.
    expect(maskMcpArgs(['--token', 'abcdefghijklmnop'])).toEqual([
      '--token',
      '•••• mnop'
    ])
  })

  it.each([
    // The re-review's probes (N2): all digits after a secret flag or under a
    // secret name is still the secret.
    [
      ['-u', 'root', '-p', '98765432'],
      ['-u', 'root', '-p', '••••']
    ],
    [
      ['--password', '20231231'],
      ['--password', '••••']
    ],
    [['--password=20231231'], ['--password=••••']],
    [['DB_PASSWORD=12345678'], ['DB_PASSWORD=••••']],
    [
      ['-e', 'DB_PASSWORD=12345678'],
      ['-e', 'DB_PASSWORD=••••']
    ],
    [
      ['--api-key', '1234567890123456789012345'],
      ['--api-key', '•••• 2345']
    ],
    [
      ['--pin', '1234'],
      ['--pin', '1234']
    ],
    // A version-shaped value under a secret name is masked too.
    [['--sig=v2'], ['--sig=••••']],
    [
      ['--token', 'v1.2.3'],
      ['--token', '••••']
    ],
    // Allowlisted names stay visible whatever the value.
    [
      ['--max-tokens', '4096'],
      ['--max-tokens', '4096']
    ],
    [
      ['--signature-version', 'v4'],
      ['--signature-version', 'v4']
    ],
    // An env reference is not the secret.
    [
      ['--password', '$DB_PASSWORD'],
      ['--password', '$DB_PASSWORD']
    ]
  ])('masks %j as %j, whatever the value looks like', (args, shown) => {
    expect(maskMcpArgs(args)).toEqual(shown)
  })

  it('`Bearer $TOKEN` is an env reference, not the secret', () => {
    const args = ['--header', 'Authorization: Bearer $TOKEN']
    expect(maskMcpArgs(args)).toEqual(args)
    expect(
      maskMcpArgs(['--header', 'Authorization: Bearer ${API_TOKEN}'])
    ).toEqual(['--header', 'Authorization: Bearer ${API_TOKEN}'])
  })

  it('a URL with credentials under a non-secret NAME= is masked', () => {
    expect(
      maskMcpArgs(['-e', 'DATABASE_URL=postgres://app:hunter2-long@db:5432/x'])
    ).toEqual(['-e', 'DATABASE_URL=postgres://••••@db:5432/x'])
  })
})
