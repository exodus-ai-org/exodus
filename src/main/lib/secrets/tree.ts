type Tree = Record<string, unknown>

export function isPlainObject(value: unknown): value is Tree {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** The value at a dotted path, or `undefined` when any step is missing. */
export function getAtPath(obj: unknown, path: string): unknown {
  let o: unknown = obj
  for (const key of path.split('.')) {
    if (!isPlainObject(o)) return undefined
    o = o[key]
  }
  return o
}

/**
 * The object that holds a dotted path's last key, and that key — only when
 * every step to it exists (a section that was not sent is not created).
 */
export function parentOf(
  obj: unknown,
  path: string
): { parent: Tree; key: string } | null {
  const keys = path.split('.')
  const key = keys.pop()!
  let o: unknown = obj
  for (const k of keys) {
    if (!isPlainObject(o)) return null
    o = o[k]
  }
  return isPlainObject(o) ? { parent: o, key } : null
}
