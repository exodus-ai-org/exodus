import { readdirSync, readFileSync } from 'fs'
import { join, relative } from 'path'

import { parse } from '@babel/parser'
import _traverse from '@babel/traverse'
import { describe, expect, it } from 'vitest'

import { ALLOWLIST } from './allowlist'

// @babel/traverse ships as CJS; under ESM interop the real function can land
// on `.default` or be the module namespace itself depending on the bundler.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const traverse: any = (_traverse as any).default ?? _traverse

const ROOT = join(__dirname, '..', '..', '..')
const RENDERER_ROOT = join(ROOT, 'src', 'renderer')
const EXCLUDED_DIRS = [join(RENDERER_ROOT, 'components', 'ui')]
const EXCLUDED_FILES = new Set([
  join(RENDERER_ROOT, 'sub-apps', 'artifacts', 'sandbox.tsx')
])

// A JSX text node or sileo string must contain a run of 3+ ASCII letters to
// count as "prose" — this excludes pure punctuation/emoji/CJK-only content
// and short symbol fragments.
const PROSE_RE = /[A-Za-z]{3,}/

interface Violation {
  file: string
  line: number
  text: string
  kind: string
}

function collectTsxFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (EXCLUDED_DIRS.some((d) => full === d || full.startsWith(d + '/')))
      continue
    if (entry.isDirectory()) {
      out.push(...collectTsxFiles(full))
    } else if (entry.name.endsWith('.tsx') && !EXCLUDED_FILES.has(full)) {
      out.push(full)
    }
  }
  return out
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isInsideTransOrT(path: any): boolean {
  let p = path.parentPath
  while (p) {
    if (
      p.isJSXElement() &&
      p.node.openingElement.name.type === 'JSXIdentifier' &&
      p.node.openingElement.name.name === 'Trans'
    ) {
      return true
    }
    if (
      p.isCallExpression() &&
      p.node.callee.type === 'Identifier' &&
      p.node.callee.name === 't'
    ) {
      return true
    }
    p = p.parentPath
  }
  return false
}

// A sileo `title`/`description` value can be a plain string, a template
// literal (check its static quasis), or a ternary picking between two such
// values (check both branches) — all three are just different syntaxes for
// "a hardcoded string ends up in this field", so all three are in scope.
function collectProseFromExpr(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node: any,
  out: { line: number; text: string }[]
): void {
  if (!node) return
  if (node.type === 'StringLiteral') {
    if (PROSE_RE.test(node.value)) {
      out.push({ line: node.loc?.start.line ?? 0, text: node.value })
    }
  } else if (node.type === 'TemplateLiteral') {
    for (const q of node.quasis) {
      const raw = q.value.cooked ?? q.value.raw
      if (raw && PROSE_RE.test(raw)) {
        out.push({ line: node.loc?.start.line ?? 0, text: raw })
      }
    }
  } else if (node.type === 'ConditionalExpression') {
    collectProseFromExpr(node.consequent, out)
    collectProseFromExpr(node.alternate, out)
  }
}

function scanRendererFile(filePath: string): Violation[] {
  const source = readFileSync(filePath, 'utf8')
  const relPath = relative(ROOT, filePath)
  const violations: Violation[] = []

  const ast = parse(source, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  })

  traverse(ast, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    JSXText(path: any) {
      const text = path.node.value.trim().replace(/\s+/g, ' ')
      if (text && PROSE_RE.test(text) && !isInsideTransOrT(path)) {
        violations.push({
          file: relPath,
          line: path.node.loc?.start.line ?? 0,
          text,
          kind: 'jsx-text'
        })
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CallExpression(path: any) {
      const callee = path.node.callee
      if (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' &&
        callee.object.name === 'sileo' &&
        callee.property.type === 'Identifier'
      ) {
        const arg = path.node.arguments[0]
        if (arg && arg.type === 'ObjectExpression') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const prop of arg.properties as any[]) {
            if (
              prop.type === 'ObjectProperty' &&
              prop.key.type === 'Identifier' &&
              (prop.key.name === 'title' || prop.key.name === 'description')
            ) {
              const found: { line: number; text: string }[] = []
              collectProseFromExpr(prop.value, found)
              for (const f of found) {
                violations.push({
                  file: relPath,
                  line: f.line,
                  text: f.text,
                  kind: 'sileo'
                })
              }
            }
          }
        }
      }
    }
  })

  return violations
}

// Main-process menu/tray labels: `label: '…'` string literals that don't
// route through `mainT(...)`.
function scanMainLabelFile(filePath: string): Violation[] {
  const source = readFileSync(filePath, 'utf8')
  const relPath = relative(ROOT, filePath)
  const violations: Violation[] = []

  const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] })

  traverse(ast, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ObjectProperty(path: any) {
      const key = path.node.key
      if (key.type !== 'Identifier' || key.name !== 'label') return
      const found: { line: number; text: string }[] = []
      collectProseFromExpr(path.node.value, found)
      for (const f of found) {
        violations.push({
          file: relPath,
          line: f.line,
          text: f.text,
          kind: 'menu-label'
        })
      }
    }
  })

  return violations
}

function isAllowlisted(v: Violation): boolean {
  return ALLOWLIST.some((e) => e.file === v.file && e.text === v.text)
}

describe('no-hardcoded-strings guard', () => {
  const rendererFiles = collectTsxFiles(RENDERER_ROOT)
  const mainLabelFiles = [
    join(ROOT, 'src', 'main', 'lib', 'menu.ts'),
    join(ROOT, 'src', 'main', 'lib', 'tray.ts')
  ]

  const violations = [
    ...rendererFiles.flatMap(scanRendererFile),
    ...mainLabelFiles.flatMap(scanMainLabelFile)
  ].filter((v) => !isAllowlisted(v))

  it("has no un-i18n'd JSX text, sileo title/description, or menu/tray label", () => {
    const report = violations
      .map((v) => `${v.file}:${v.line} [${v.kind}] ${JSON.stringify(v.text)}`)
      .join('\n')
    expect(violations, `hardcoded strings found:\n${report}`).toEqual([])
  })

  it('every allowlist entry still matches something in its file (no stale entries)', () => {
    for (const entry of ALLOWLIST) {
      const full = join(ROOT, entry.file)
      const source = readFileSync(full, 'utf8')
      expect(
        source.includes(entry.text),
        `allowlist entry no longer found in ${entry.file}: ${JSON.stringify(entry.text)}`
      ).toBe(true)
    }
  })
})
