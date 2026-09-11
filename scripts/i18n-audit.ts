// Phase 1: report only the count of un-i18n'd JSX text nodes and toast titles.
// Phase 5 turns this into a gate-blocking test with an allowlist.
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const SRC = join(__dirname, '..', 'src', 'renderer')

function walk(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((p) => p.endsWith('.tsx') && !p.includes('components/ui/'))
    .map((p) => join(dir, p))
}

let jsxText = 0
let toastTitles = 0
for (const file of walk(SRC)) {
  const src = readFileSync(file, 'utf8')
  jsxText += (src.match(/>\s*[A-Z][a-zA-Z]{2,}[^<>{}]*</g) ?? []).length
  toastTitles += (src.match(/title:\s*['"][A-Z]/g) ?? []).length
}
console.log(
  `un-i18n'd (approx):  JSX text nodes ${jsxText}   toast titles ${toastTitles}`
)
