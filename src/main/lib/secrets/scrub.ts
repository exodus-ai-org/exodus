import {
  chmodSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from 'fs'
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

/** Files larger than this are skipped (read whole; one must not abort the rest). */
const MAX_SCRUB_BYTES = 64 * 1024 * 1024

export interface ScrubResult {
  /** Files rewritten with secrets masked. */
  changed: number
  /** Files over the size cap, left as they are (and logged). */
  skipped: number
  /** Files that could not be read or written. */
  failed: number
}

/**
 * Every `*.jsonl` log file in `dir` rewritten with `scrubSecrets` applied —
 * a line written before the secret-safe errors (S1) could quote a key. Run
 * by the one-time purge (`migrate.ts`), before the server starts.
 *
 * Each file on its own: one that is over `maxBytes` is skipped, one that
 * fails is counted, and neither stops the rest. A rewrite goes through a
 * temp file in the same directory and a `rename`, with the file's mode
 * kept, so a crash midway leaves the old file or the new one, never half of
 * one. A line the logger appends to today's file between the read and the
 * rename is lost (a known, one-time race).
 */
export function scrubLogFiles(
  dir: string,
  secrets: readonly string[],
  { maxBytes = MAX_SCRUB_BYTES }: { maxBytes?: number } = {}
): ScrubResult {
  const result: ScrubResult = { changed: 0, skipped: 0, failed: 0 }
  let names: string[]
  try {
    names = readdirSync(dir).filter((f) => f.endsWith('.jsonl'))
  } catch {
    return result
  }
  for (const name of names) {
    const path = join(dir, name)
    const tmp = join(dir, `.${name}.scrub-${process.pid}.tmp`)
    try {
      const { size, mode } = statSync(path)
      if (size > maxBytes) {
        result.skipped++
        continue
      }
      const text = readFileSync(path, 'utf8')
      const out = scrubSecrets(text, secrets)
      if (out === text) continue
      writeFileSync(tmp, out, { encoding: 'utf8', mode: mode & 0o777 })
      chmodSync(tmp, mode & 0o777)
      renameSync(tmp, path)
      result.changed++
    } catch {
      rmSync(tmp, { force: true })
      result.failed++
    }
  }
  return result
}
