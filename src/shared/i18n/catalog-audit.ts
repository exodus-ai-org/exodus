export type NsMap = Record<string, Map<string, string>>

export interface Finding {
  locale: string
  level: 'error' | 'info'
  message: string
}

export function flattenCatalog(
  json: unknown,
  prefix = ''
): Map<string, string> {
  const out = new Map<string, string>()
  if (typeof json === 'string') {
    out.set(prefix, json)
    return out
  }
  if (json && typeof json === 'object') {
    for (const [k, v] of Object.entries(json)) {
      const key = prefix ? `${prefix}.${k}` : k
      for (const [ik, iv] of flattenCatalog(v, key)) out.set(ik, iv)
    }
  }
  return out
}

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/
const stripPlural = (k: string) => k.replace(PLURAL_SUFFIX, '')
const vars = (s: string) =>
  new Set([...s.matchAll(/\{\{\s*([\w.]+)/g)].map((m) => m[1]))

export function auditCatalogs(input: {
  en: NsMap
  others: Record<string, { nsMap: NsMap; source: string }>
}): { ok: boolean; findings: Finding[] } {
  const findings: Finding[] = []
  const enFlat = new Map<string, string>()
  for (const [ns, m] of Object.entries(input.en)) {
    for (const [k, v] of m) enFlat.set(`${ns}:${k}`, v)
  }
  const enBases = new Set(
    [...enFlat.keys()].map((k) => {
      const [ns, dot] = k.split(':')
      return `${ns}:${stripPlural(dot)}`
    })
  )

  for (const [locale, { nsMap, source }] of Object.entries(input.others)) {
    const locFlat = new Map<string, string>()
    for (const [ns, m] of Object.entries(nsMap)) {
      for (const [k, v] of m) locFlat.set(`${ns}:${k}`, v)
    }

    for (const key of locFlat.keys()) {
      const [ns, dot] = key.split(':')
      if (!enFlat.has(key) && !enBases.has(`${ns}:${stripPlural(dot)}`)) {
        findings.push({ locale, level: 'error', message: `orphan key ${key}` })
      }
    }

    for (const [key, enValue] of enFlat) {
      const locValue = locFlat.get(key)
      if (locValue === undefined) continue
      for (const v of vars(enValue)) {
        if (!vars(locValue).has(v)) {
          findings.push({
            locale,
            level: 'error',
            message: `${key} is missing {{${v}}}`
          })
        }
      }
    }

    const missing = [...enBases].filter((base) => {
      const [ns, dot] = base.split(':')
      for (const lk of locFlat.keys()) {
        const [lns, ldot] = lk.split(':')
        if (lns === ns && stripPlural(ldot) === dot) return false
      }
      return true
    })
    if (missing.length > 0) {
      const translated = source === 'machine' || source === 'reviewed'
      findings.push({
        locale,
        level: translated ? 'error' : 'info',
        message: `${missing.length} key(s) not translated (source: ${source})`
      })
    }
  }

  return { ok: findings.every((f) => f.level !== 'error'), findings }
}
