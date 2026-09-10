const BRAVE_NEWS_URL = 'https://api.search.brave.com/res/v1/news/search'

export interface BraveNewsArticle {
  title: string
  url: string
  description: string
  source: string
  favicon?: string
  thumbnail?: string
  /** Human freshness label from Brave, e.g. "10 hours ago". */
  age?: string
  /** ISO timestamp from Brave (`page_age`), when available — the honest one. */
  publishedAt?: string
}

interface BraveNewsRawResult {
  title?: string
  url?: string
  description?: string
  source?: string
  age?: string
  page_age?: string
  thumbnail?: { src?: string }
  meta_url?: { hostname?: string; favicon?: string }
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

/** Brave's `page_age` is UTC but usually ships without the trailing `Z`. */
function normalizeIso(s: string | undefined): string | undefined {
  if (!s) return undefined
  if (/[zZ]|[+-]\d\d:?\d\d$/.test(s)) return s
  return `${s.replace(' ', 'T')}Z`
}

const RELATIVE_AGE_RE = /^(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago$/i
const UNIT_MS: Record<string, number> = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
  month: 2_592_000_000,
  year: 31_536_000_000
}

/**
 * Epoch-ms estimate of when an article was published (higher = more recent).
 * `page_age` (ISO) is authoritative; otherwise parse Brave's relative `age`
 * string; a result with neither sorts to the bottom (usually an evergreen
 * page — a club profile, a "how to watch" hub — not real news).
 */
function publishedAtMs(r: BraveNewsRawResult): number {
  const iso = normalizeIso(r.page_age)
  if (iso) {
    const t = Date.parse(iso)
    if (!Number.isNaN(t)) return t
  }
  if (r.age) {
    if (/^just now$/i.test(r.age.trim())) return Date.now()
    const m = RELATIVE_AGE_RE.exec(r.age.trim())
    if (m) return Date.now() - Number(m[1]) * UNIT_MS[m[2].toLowerCase()]
  }
  return 0
}

/**
 * Brave News ranks by relevance, not recency, and has no sort param — so a
 * generic query ("FC Barcelona news") surfaces heavily-linked pre-match
 * previews over the match report that broke two hours ago. We pull a wide
 * relevance-ranked pool, re-sort it by recency, and return the freshest of
 * the still-relevant results — a Google-News-style "latest" within the pool.
 */
export async function searchBraveNews(
  apiKey: string,
  query: string,
  opts: { count: number; country?: string | null; language?: string | null }
): Promise<BraveNewsArticle[]> {
  const want = Math.max(opts.count, 1)
  const poolSize = Math.min(Math.max(want * 5, 12), 20)

  const params = new URLSearchParams()
  params.set('q', query)
  params.set('count', String(poolSize))
  params.set('freshness', 'pd')
  if (opts.country) params.set('country', opts.country.toLowerCase())
  if (opts.language) params.set('search_lang', opts.language)

  const res = await fetch(`${BRAVE_NEWS_URL}?${params.toString()}`, {
    headers: { accept: 'application/json', 'x-subscription-token': apiKey }
  })
  if (!res.ok) {
    throw new Error(`Brave News search failed: ${res.status}`)
  }
  const body = (await res.json()) as { results?: BraveNewsRawResult[] }

  const pool = (body.results ?? [])
    .filter((r) => r.title && r.url)
    .map((r) => ({ r, ts: publishedAtMs(r) }))
    .sort((a, b) => b.ts - a.ts)

  return pool.slice(0, want).map(({ r }) => ({
    title: r.title!,
    url: r.url!,
    description: r.description ?? '',
    source: r.source ?? r.meta_url?.hostname ?? safeHostname(r.url!),
    favicon: r.meta_url?.favicon,
    thumbnail: r.thumbnail?.src,
    age: r.age,
    publishedAt: normalizeIso(r.page_age)
  }))
}
