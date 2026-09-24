import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

import { maskSecret } from './mask'

/** Shorter values are too likely to match ordinary text to be scrubbed. */
const MIN_SCRUB_LENGTH = 8

/**
 * `text` with every occurrence of each `secrets` value — as written, and as
 * it appears inside a JSON string (quotes / backslashes escaped) — replaced
 * by its mask. For copies of text that may predate the secret-safe errors
 * (the Chat Audit `logs` table, review S2 M3). Longest first, so a secret
 * that contains another is masked whole.
 */
export function scrubSecrets(text: string, secrets: readonly string[]): string {
  let out = text
  const values = [...new Set(secrets)]
    .filter((s) => s.length >= MIN_SCRUB_LENGTH)
    .toSorted((a, b) => b.length - a.length)
  for (const secret of values) {
    const mask = maskSecret(secret)!
    const escaped = JSON.stringify(secret).slice(1, -1)
    out = out.replaceAll(secret, mask)
    if (escaped !== secret) out = out.replaceAll(escaped, mask)
  }
  return out
}

/**
 * Every `*.jsonl` log file in `dir` rewritten with `scrubSecrets` applied —
 * a line written before the secret-safe errors (S1) could quote a key.
 * Only files that change are written; returns how many. Run by the one-time
 * purge (`migrate.ts`), before the server starts. A line the logger appends
 * between the read and the write of today's file would be lost (a known,
 * one-time race).
 */
export function scrubLogFiles(dir: string, secrets: readonly string[]): number {
  let names: string[]
  try {
    names = readdirSync(dir).filter((f) => f.endsWith('.jsonl'))
  } catch {
    return 0
  }
  let changed = 0
  for (const name of names) {
    const path = join(dir, name)
    const text = readFileSync(path, 'utf8')
    const out = scrubSecrets(text, secrets)
    if (out === text) continue
    writeFileSync(path, out, 'utf8')
    changed++
  }
  return changed
}
