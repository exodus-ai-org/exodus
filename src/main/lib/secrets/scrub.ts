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
