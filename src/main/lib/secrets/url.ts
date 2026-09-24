/**
 * A base URL in a comparable form: trimmed, scheme and host lowercased, no
 * trailing slash. `null` for an empty one ("use the stored / default").
 */
export function normalizeBaseUrl(
  url: string | null | undefined
): string | null {
  const trimmed = url?.trim()
  if (!trimmed) return null
  try {
    const u = new URL(trimmed)
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/u, '')}${u.search}`
  } catch {
    return trimmed.replace(/\/+$/u, '')
  }
}
