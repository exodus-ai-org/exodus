import { join } from 'path'

import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ protocol: {}, net: {} }))

const { allowDevWebSocket, resolveArtifactFile } =
  await import('@main/lib/artifact-protocol')

const ROOT = '/app/renderer/main_window'

describe('resolveArtifactFile', () => {
  it('maps a request path onto the renderer directory', () => {
    expect(
      resolveArtifactFile(ROOT, '/src/renderer/sub-apps/artifacts/index.html')
    ).toBe(join(ROOT, 'src/renderer/sub-apps/artifacts/index.html'))
    expect(resolveArtifactFile(ROOT, '/assets/chunk-abc.js')).toBe(
      join(ROOT, 'assets/chunk-abc.js')
    )
  })

  // The URL parser already folds a literal `..`; an encoded one reaches us intact.
  it.each([
    ['/../../../etc/passwd'],
    ['/assets/..%2F..%2F..%2Fetc%2Fpasswd'],
    ['/%2e%2e/%2e%2e/secret'],
    ['/assets/%00.js'],
    ['/%E0%A4%A']
  ])('refuses %s', (pathname) => {
    expect(resolveArtifactFile(ROOT, pathname)).toBeNull()
  })

  it('refuses the directory itself', () => {
    expect(resolveArtifactFile(ROOT, '/')).toBeNull()
  })

  it('is not fooled by a sibling directory that shares the prefix', () => {
    expect(resolveArtifactFile(ROOT, '/../main_window_evil/x.js')).toBeNull()
  })
})

describe('allowDevWebSocket', () => {
  const html = `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'self'; img-src *" />`

  it("adds the dev server's websocket to connect-src and nothing else", () => {
    const out = allowDevWebSocket(html, 'http://localhost:5173')
    expect(out).toContain("connect-src 'self' ws://localhost:5173;")
    expect(out).toContain("default-src 'self';")
    expect(out).toContain('img-src *')
  })

  it('tolerates a trailing slash on the dev server URL', () => {
    expect(allowDevWebSocket(html, 'http://localhost:5173/')).toContain(
      "connect-src 'self' ws://localhost:5173;"
    )
  })

  it('leaves a page without a connect-src directive alone', () => {
    expect(allowDevWebSocket('<p>x</p>', 'http://localhost:5173')).toBe(
      '<p>x</p>'
    )
  })
})
