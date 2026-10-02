// The linkify rule (`workspacePathCandidate`): which inline code in an answer
// may become a link to a workspace file — before main is asked whether the
// file exists and is really inside.
import {
  workspaceFileKind,
  workspacePathCandidate
} from '@exodus/shared/types/workspace-files'
import { describe, expect, it } from 'vitest'

const roots = { root: '/Users/me/.exodus/workspace', home: '/Users/me' }

describe('workspacePathCandidate', () => {
  it('takes an absolute or ~/ path to a file under the workspace root', () => {
    expect(
      workspacePathCandidate(
        '/Users/me/.exodus/workspace/c1/investment-rules.md',
        roots
      )
    ).toBe('/Users/me/.exodus/workspace/c1/investment-rules.md')
    expect(
      workspacePathCandidate('~/.exodus/workspace/c1/notes/a.txt', roots)
    ).toBe('/Users/me/.exodus/workspace/c1/notes/a.txt')
    expect(
      workspacePathCandidate(' /Users/me/.exodus/workspace/c1/a.md ', roots)
    ).toBe('/Users/me/.exodus/workspace/c1/a.md')
  })

  it.each([
    ['a relative path', 'investment-rules.md'],
    ['a command', 'npm install'],
    ['a path outside the workspace', '/Users/me/Desktop/a.md'],
    [
      'a sibling with the same prefix',
      '/Users/me/.exodus/workspace-old/c1/a.md'
    ],
    ['a traversal out', '/Users/me/.exodus/workspace/c1/../../lock.dat'],
    ['a ~/ traversal out', '~/.exodus/workspace/../tls/key.pem'],
    ['a ./ segment', '/Users/me/.exodus/workspace/./c1/a.md'],
    ['the workspace root', '/Users/me/.exodus/workspace/'],
    ['a chat workspace dir', '/Users/me/.exodus/workspace/c1'],
    ['two lines', '/Users/me/.exodus/workspace/c1/a.md\n/etc/passwd'],
    ['a bare ~', '~'],
    ['a URL', 'https://example.com/a.md'],
    ['an overlong text', `/Users/me/.exodus/workspace/c1/${'a'.repeat(2000)}`]
  ])('refuses %s', (_label, text) => {
    expect(workspacePathCandidate(text, roots)).toBeNull()
  })
})

describe('workspaceFileKind', () => {
  it('reads Markdown extensions as markdown, the rest as text', () => {
    expect(workspaceFileKind('rules.md')).toBe('markdown')
    expect(workspaceFileKind('README.MARKDOWN')).toBe('markdown')
    expect(workspaceFileKind('data.csv')).toBe('text')
    expect(workspaceFileKind('md')).toBe('text')
  })
})
