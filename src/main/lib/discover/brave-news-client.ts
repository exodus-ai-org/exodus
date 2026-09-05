const BRAVE_NEWS_URL = 'https://api.search.brave.com/res/v1/news/search'

export interface BraveNewsArticle {
  title: string
  url: string
  description: string
  source: string
  favicon?: string
  thumbnail?: string
  age?: string
}

interface BraveNewsRawResult {
  title?: string
  url?: string
  description?: string
  source?: string
  age?: string
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

export async function searchBraveNews(
  apiKey: string,
  query: string,
  opts: { count: number; country?: string | null; language?: string | null }
): Promise<BraveNewsArticle[]> {
  const params = new URLSearchParams()
  params.set('q', query)
  params.set('count', String(Math.min(Math.max(opts.count, 1), 20)))
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

  const articles: BraveNewsArticle[] = []
  for (const r of body.results ?? []) {
    if (!r.title || !r.url) continue
    articles.push({
      title: r.title,
      url: r.url,
      description: r.description ?? '',
      source: r.source ?? r.meta_url?.hostname ?? safeHostname(r.url),
      favicon: r.meta_url?.favicon,
      thumbnail: r.thumbnail?.src,
      age: r.age
    })
  }
  return articles
}
